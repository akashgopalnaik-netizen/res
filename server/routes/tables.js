const express = require('express');
const { body, validationResult } = require('express-validator');
const Table = require('../models/Table');
const Order = require('../models/Order');
const { protect, authorize } = require('../middleware/auth');
const QRCode = require('qrcode');

const router = express.Router();

// @route   GET /api/tables
// @desc    Get all tables
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status, section } = req.query;

    const query = {};
    if (status) query.status = status;
    if (section) query.section = section;

    const tables = await Table.find(query)
      .populate('currentOrder', 'orderNumber status total')
      .populate('assignedServer', 'name')
      .sort({ tableNumber: 1 });

    res.json({ success: true, data: { tables } });
  } catch (error) {
    console.error('Get tables error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/tables/available
// @desc    Get available tables for ordering
// @access  Public
router.get('/available/public', async (req, res) => {
  try {
    const tables = await Table.find({ status: 'available' })
      .select('tableNumber section capacity features qrCode');

    res.json({ success: true, data: { tables } });
  } catch (error) {
    console.error('Get available tables error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/tables/:id
// @desc    Get table by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const table = await Table.findById(req.params.id)
      .populate('currentOrder', 'orderNumber status items total')
      .populate('assignedServer', 'name email');

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    res.json({ success: true, data: { table } });
  } catch (error) {
    console.error('Get table error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/tables
// @desc    Create table
// @access  Private/Admin
router.post('/', protect, authorize('admin', 'manager'), [
  body('tableNumber').isNumeric().withMessage('Table number must be numeric'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const table = await Table.create(req.body);

      // Generate QR code for table
      const qrData = `${process.env.CLIENT_URL}/table/${table.tableNumber}`;
      const qrCode = await QRCode.toDataURL(qrData);
      table.qrCode = qrCode;
      await table.save();

      res.status(201).json({
        success: true,
        message: 'Table created successfully',
        data: { table }
      });
    } catch (error) {
      console.error('Create table error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
]);

// @route   PUT /api/tables/:id
// @desc    Update table
// @access  Private/Admin
router.put('/:id', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const table = await Table.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    res.json({
      success: true,
      message: 'Table updated successfully',
      data: { table }
    });
  } catch (error) {
    console.error('Update table error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/tables/:id/status
// @desc    Update table status
// @access  Private/Staff
router.put('/:id/status', protect, authorize('admin', 'manager', 'staff'), async (req, res) => {
  try {
    const { status, currentOrderId } = req.body;

    const table = await Table.findById(req.params.id);
    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    table.status = status;
    if (currentOrderId) {
      table.currentOrder = currentOrderId;
    }

    await table.save();

    res.json({
      success: true,
      message: 'Table status updated',
      data: { table }
    });
  } catch (error) {
    console.error('Update table status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/tables/:id
// @desc    Delete table
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    if (table.status === 'occupied') {
      return res.status(400).json({ success: false, message: 'Cannot delete occupied table' });
    }

    await table.deleteOne();

    res.json({ success: true, message: 'Table deleted successfully' });
  } catch (error) {
    console.error('Delete table error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/tables/:tableNumber/qr
// @desc    Get QR code for table
// @access  Public
router.get('/:tableNumber/qr', async (req, res) => {
  try {
    const table = await Table.findOne({ tableNumber: req.params.tableNumber });

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    const qrData = `${process.env.CLIENT_URL}/table/${table.tableNumber}`;
    const qrCode = await QRCode.toDataURL(qrData);

    res.json({
      success: true,
      data: {
        tableNumber: table.tableNumber,
        qrCode,
        url: qrData
      }
    });
  } catch (error) {
    console.error('Generate QR error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/tables/stats/overview
// @desc    Get table statistics
// @access  Private/Admin
router.get('/stats/overview', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const totalTables = await Table.countDocuments();
    const availableTables = await Table.countDocuments({ status: 'available' });
    const occupiedTables = await Table.countDocuments({ status: 'occupied' });
    const reservedTables = await Table.countDocuments({ status: 'reserved' });

    const sectionStats = await Table.aggregate([
      { $group: { _id: '$section', total: { $sum: 1 }, available: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } } } }
    ]);

    const capacityStats = await Table.aggregate([
      { $group: { _id: null, totalCapacity: { $sum: '$capacity' } } }
    ]);

    res.json({
      success: true,
      data: {
        totalTables,
        availableTables,
        occupiedTables,
        reservedTables,
        utilization: totalTables > 0 ? ((occupiedTables / totalTables) * 100).toFixed(1) : 0,
        sectionStats,
        totalCapacity: capacityStats[0]?.totalCapacity || 0
      }
    });
  } catch (error) {
    console.error('Table stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
