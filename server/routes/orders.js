const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/orders
// @desc    Get orders (filtered by role)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status, orderType, page = 1, limit = 20, startDate, endDate } = req.query;

    const query = {};

    // Filter by role
    if (req.user.role === 'customer') {
      query.customer = req.user.id;
    }
    // Staff, managers, and admins can see all orders

    if (status) query.status = status;
    if (orderType) query.orderType = orderType;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query)
      .populate('customer', 'name email phone')
      .populate('table', 'tableNumber section')
      .populate('items.menuItem', 'name category')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('table', 'tableNumber section')
      .populate('items.menuItem', 'name description category price images')
      .populate('assignedStaff', 'name email');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check authorization
    if (req.user.role === 'customer' && order.customer._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, data: { order } });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/', protect, [
  body('orderType').isIn(['dine-in', 'takeout', 'delivery', 'reservation']).withMessage('Invalid order type'),
  body('items').isArray({ min: 1 }).withMessage('Order must have at least one item'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { orderType, tableId, items, specialInstructions, deliveryAddress, paymentMethod } = req.body;

      // Validate and calculate prices
      let subtotal = 0;
      const validatedItems = [];

      for (const item of items) {
        const menuItem = await MenuItem.findById(item.menuItem);
        if (!menuItem) {
          return res.status(404).json({ success: false, message: `Menu item not found: ${item.menuItem}` });
        }
        if (!menuItem.isAvailable) {
          return res.status(400).json({ success: false, message: `${menuItem.name} is not available` });
        }

        const itemTotal = menuItem.price * item.quantity;
        subtotal += itemTotal;

        validatedItems.push({
          menuItem: menuItem._id,
          name: menuItem.name,
          quantity: item.quantity,
          price: menuItem.price,
          modifiers: item.modifiers || [],
          specialInstructions: item.specialInstructions || ''
        });
      }

      // Calculate tax and total
      const tax = subtotal * 0.08; // 8% tax
      const total = subtotal + tax;

      // Get table info if dine-in
      let tableNumber = null;
      let actualTableId = null;

      if (tableId && orderType === 'dine-in') {
        const table = await Table.findOne({ tableNumber: Number(tableId) });
        if (table) {
          tableNumber = table.tableNumber;
          actualTableId = table._id;
        } else {
          tableNumber = Number(tableId);
        }
      }

      // Create order
      const order = await Order.create({
        customer: req.user.id,
        customerName: req.user.name,
        customerPhone: req.user.phone,
        orderType,
        table: actualTableId,
        tableNumber,
        items: validatedItems,
        subtotal,
        tax,
        total,
        specialInstructions,
        deliveryAddress: orderType === 'delivery' ? deliveryAddress : null,
        status: 'pending',
        payment: {
          method: paymentMethod || 'cash_at_counter',
          status: 'pending'
        },
        source: req.user.role === 'customer' ? 'online' : 'pos'
      });

      // Emit socket event for real-time updates
      const io = req.app.get('io');
      if (io) {
        io.to('kitchen').emit('new-order', { order });
        io.emit(`order-${order._id}`, { event: 'order-created', order });
      }

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: { order }
      });
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
]);

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private/Staff
router.put('/:id/status', protect, authorize('admin', 'manager', 'staff'), async (req, res) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'refunded'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.status = status;
    if (note) {
      order.timeline.push({ status, timestamp: new Date(), note });
    }

    await order.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`order-${order._id}`).emit('order-status-update', { orderId: order._id, status, timestamp: new Date() });
      io.to('kitchen').emit('order-status-changed', { order });
    }

    res.json({
      success: true,
      message: 'Order status updated',
      data: { order }
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/orders/:id
// @desc    Update order
// @access  Private/Staff
router.put('/:id', protect, authorize('admin', 'manager', 'staff'), async (req, res) => {
  try {
    const { specialInstructions, estimatedTime, assignedStaff } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { specialInstructions, estimatedTime, assignedStaff },
      { new: true, runValidators: true }
    ).populate('customer', 'name email phone');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/orders/:id
// @desc    Cancel order
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check authorization
    if (req.user.role === 'customer' && order.customer.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (['completed', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel order in current status' });
    }

    order.status = 'cancelled';
    order.timeline.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: req.body.reason || 'Order cancelled'
    });

    await order.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`order-${order._id}`).emit('order-cancelled', { orderId: order._id });
      io.to('kitchen').emit('order-cancelled', { order });
    }

    res.json({ success: true, message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/orders/:id/items
// @desc    Add item to existing order
// @access  Private/Staff
router.post('/:id/items', protect, authorize('admin', 'manager', 'staff'), async (req, res) => {
  try {
    const { menuItem, quantity, specialInstructions } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const menuitem = await MenuItem.findById(menuItem);
    if (!menuitem || !menuitem.isAvailable) {
      return res.status(400).json({ success: false, message: 'Menu item not available' });
    }

    const newItem = {
      menuItem: menuitem._id,
      name: menuitem.name,
      quantity,
      price: menuitem.price,
      specialInstructions
    };

    order.items.push(newItem);

    // Recalculate totals
    order.subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    order.tax = order.subtotal * 0.08;
    order.total = order.subtotal + order.tax;

    await order.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`order-${order._id}`).emit('order-updated', { order });
    }

    res.json({
      success: true,
      message: 'Item added to order',
      data: { order }
    });
  } catch (error) {
    console.error('Add item to order error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/orders/stats/overview
// @desc    Get order statistics
// @access  Private/Admin
router.get('/stats/overview', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalOrders = await Order.countDocuments();
    const todayOrders = await Order.countDocuments({ createdAt: { $gte: today } });
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const preparingOrders = await Order.countDocuments({ status: 'preparing' });

    const revenueStats = await Order.aggregate([
      { $match: { status: { $in: ['completed', 'ready'] } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' }
        }
      }
    ]);

    const statusBreakdown = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        totalOrders,
        todayOrders,
        pendingOrders,
        preparingOrders,
        revenue: revenueStats[0] || { totalRevenue: 0, avgOrderValue: 0 },
        statusBreakdown
      }
    });
  } catch (error) {
    console.error('Order stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/orders/kitchen/display
// @desc    Get orders for kitchen display
// @access  Private/Staff
router.get('/kitchen/display', protect, authorize('admin', 'manager', 'staff'), async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] }
    })
      .populate('table', 'tableNumber section')
      .sort({ createdAt: 1 });

    res.json({ success: true, data: { orders } });
  } catch (error) {
    console.error('Kitchen display error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
