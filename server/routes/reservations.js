const express = require('express');
const { body, validationResult } = require('express-validator');
const Reservation = require('../models/Reservation');
const Table = require('../models/Table');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/reservations
// @desc    Get reservations
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status, date, page = 1, limit = 20 } = req.query;

    const query = {};

    // Filter by role
    if (req.user.role === 'customer') {
      query.customer = req.user.id;
    }

    if (status) query.status = status;
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);
      query.date = { $gte: targetDate, $lt: nextDate };
    }

    const reservations = await Reservation.find(query)
      .populate('customer', 'name email phone')
      .populate('table', 'tableNumber section')
      .sort({ date: 1, time: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Reservation.countDocuments(query);

    res.json({
      success: true,
      data: {
        reservations,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get reservations error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/reservations/check-availability
// @desc    Check table availability for date/time
// @access  Public
router.get('/check-availability', async (req, res) => {
  try {
    const { date, time, partySize } = req.query;

    if (!date || !time || !partySize) {
      return res.status(400).json({
        success: false,
        message: 'Date, time, and party size are required'
      });
    }

    const availableTables = await Table.find({
      capacity: { $gte: parseInt(partySize) }
    });

    const unavailableTableIds = await Reservation.find({
      date: new Date(date),
      time,
      status: { $in: ['pending', 'confirmed', 'seated'] }
    }).distinct('table');

    const trulyAvailable = availableTables.filter(
      table => !unavailableTableIds.some(id => id.toString() === table._id.toString())
    );

    res.json({
      success: true,
      data: {
        available: trulyAvailable.length > 0,
        availableTables: trulyAvailable.length,
        tables: trulyAvailable.map(t => ({
          tableNumber: t.tableNumber,
          capacity: t.capacity,
          section: t.section
        }))
      }
    });
  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/reservations/:id
// @desc    Get reservation by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('table', 'tableNumber section capacity');

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    // Check authorization
    if (req.user.role === 'customer' && reservation.customer._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, data: { reservation } });
  } catch (error) {
    console.error('Get reservation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/reservations
// @desc    Create reservation
// @access  Private
router.post('/', protect, [
  body('date').isISO8601().withMessage('Valid date is required'),
  body('time').notEmpty().withMessage('Time is required'),
  body('partySize').isInt({ min: 1 }).withMessage('Party size must be at least 1'),
  body('customerName').trim().notEmpty().withMessage('Name is required'),
  body('customerEmail').isEmail().withMessage('Valid email is required'),
  body('customerPhone').trim().notEmpty().withMessage('Phone is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { date, time, partySize, customerName, customerEmail, customerPhone, seatingPreference, specialRequests, occasion } = req.body;

      // Check for existing reservations at same time
      const existingReservation = await Reservation.findOne({
        date: new Date(date),
        time,
        status: { $in: ['pending', 'confirmed'] }
      });

      // Find available table
      let availableTable = null;
      const tables = await Table.find({
        status: { $in: ['available', 'reserved'] },
        capacity: { $gte: partySize }
      }).sort({ capacity: 1 });

      for (const table of tables) {
        const tableReservation = await Reservation.findOne({
          table: table._id,
          date: new Date(date),
          time,
          status: { $in: ['pending', 'confirmed', 'seated'] }
        });

        if (!tableReservation) {
          availableTable = table;
          break;
        }
      }

      if (!availableTable) {
        return res.status(400).json({
          success: false,
          message: 'No tables available for the selected time. Please choose another time.'
        });
      }

      const reservation = await Reservation.create({
        customer: req.user.id,
        customerName,
        customerEmail,
        customerPhone,
        date: new Date(date),
        time,
        partySize,
        table: availableTable._id,
        assignedTableNumber: availableTable.tableNumber,
        seatingPreference: seatingPreference || 'any',
        specialRequests,
        occasion: occasion || 'none',
        status: 'pending'
      });

      // Update table status if date is today
      const reservationDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      reservationDate.setHours(0, 0, 0, 0);

      if (reservationDate.getTime() === today.getTime()) {
        await Table.findByIdAndUpdate(availableTable._id, { status: 'reserved' });
      }

      res.status(201).json({
        success: true,
        message: 'Reservation created successfully',
        data: { reservation }
      });
    } catch (error) {
      console.error('Create reservation error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
]);

// @route   PUT /api/reservations/:id
// @desc    Update reservation
// @access  Private/Staff
router.put('/:id', protect, authorize('admin', 'manager', 'staff'), async (req, res) => {
  try {
    const { status, specialRequests, notes } = req.body;

    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { status, specialRequests, notes },
      { new: true, runValidators: true }
    ).populate('customer', 'name email phone');

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    // Update table status if status changed
    if (status === 'seated' && reservation.table) {
      await Table.findByIdAndUpdate(reservation.table, { status: 'occupied' });
    } else if (status === 'completed' && reservation.table) {
      await Table.findByIdAndUpdate(reservation.table, { status: 'available' });
    }

    res.json({
      success: true,
      message: 'Reservation updated successfully',
      data: { reservation }
    });
  } catch (error) {
    console.error('Update reservation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/reservations/:id/status
// @desc    Update reservation status
// @access  Private/Staff
router.put('/:id/status', protect, authorize('admin', 'manager', 'staff'), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    const oldStatus = reservation.status;
    reservation.status = status;

    // Update table status based on reservation status
    if (reservation.table) {
      if (status === 'seated') {
        await Table.findByIdAndUpdate(reservation.table, { status: 'occupied' });
      } else if (status === 'completed' || status === 'cancelled' || status === 'no-show') {
        if (oldStatus === 'seated') {
          await Table.findByIdAndUpdate(reservation.table, { status: 'available' });
        }
      }
    }

    if (status === 'completed') {
      reservation.checkOutTime = new Date();
    } else if (status === 'seated') {
      reservation.checkInTime = new Date();
    }

    await reservation.save();

    res.json({
      success: true,
      message: 'Reservation status updated',
      data: { reservation }
    });
  } catch (error) {
    console.error('Update reservation status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/reservations/:id
// @desc    Cancel reservation
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    // Check authorization
    if (req.user.role === 'customer' && reservation.customer.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (['completed', 'cancelled', 'no-show'].includes(reservation.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel reservation in current status' });
    }

    // Release table if reserved
    if (reservation.table && reservation.status === 'reserved') {
      await Table.findByIdAndUpdate(reservation.table, { status: 'available' });
    }

    reservation.status = 'cancelled';
    await reservation.save();

    res.json({ success: true, message: 'Reservation cancelled successfully' });
  } catch (error) {
    console.error('Cancel reservation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});



// @route   GET /api/reservations/stats/overview
// @desc    Get reservation statistics
// @access  Private/Admin
router.get('/stats/overview', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalReservations = await Reservation.countDocuments();
    const todayReservations = await Reservation.countDocuments({
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
    });
    const pendingReservations = await Reservation.countDocuments({ status: 'pending' });
    const confirmedReservations = await Reservation.countDocuments({ status: 'confirmed' });

    const statusBreakdown = await Reservation.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const noShowRate = await Reservation.aggregate([
      { $group: { _id: null, total: { $sum: 1 }, noShows: { $sum: { $cond: [{ $eq: ['$status', 'no-show'] }, 1, 0] } } } }
    ]);

    res.json({
      success: true,
      data: {
        totalReservations,
        todayReservations,
        pendingReservations,
        confirmedReservations,
        statusBreakdown,
        noShowRate: noShowRate[0] ? ((noShowRate[0].noShows / noShowRate[0].total) * 100).toFixed(1) : 0
      }
    });
  } catch (error) {
    console.error('Reservation stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
