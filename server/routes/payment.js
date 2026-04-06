const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();



// @route   POST /api/payment/cash
// @desc    Record cash payment
// @access  Private/Staff
router.post('/cash', protect, async (req, res) => {
  try {
    const { orderId, amountReceived } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.payment = {
      method: 'cash',
      status: 'completed',
      transactionId: `CASH-${Date.now()}`,
      paidAt: new Date(),
      amount: amountReceived || order.total
    };

    if (order.status === 'pending') {
      order.status = 'confirmed';
    }

    await order.save();

    res.json({
      success: true,
      message: 'Cash payment recorded',
      data: { order }
    });
  } catch (error) {
    console.error('Cash payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to record payment' });
  }
});

// @route   POST /api/payment/refund
// @desc    Process refund internally (cancel order)
// @access  Private/Admin
router.post('/refund', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { orderId, reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.payment.status = 'refunded';
    order.status = 'refunded';
    await order.save();

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ success: false, message: 'Refund failed', error: error.message });
  }
});

// @route   GET /api/payment/order/:orderId
// @desc    Get payment status for order
// @access  Private
router.get('/order/:orderId', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .select('orderNumber total payment');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        total: order.total,
        payment: order.payment
      }
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/payment/history
// @desc    Get payment history
// @access  Private/Admin
router.get('/history', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { startDate, endDate, method, status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (method) query['payment.method'] = method;
    if (status) query['payment.status'] = status;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query)
      .select('orderNumber customer customerName total payment createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        payments: orders.map(o => ({
          orderNumber: o.orderNumber,
          customer: o.customerName,
          amount: o.total,
          method: o.payment.method,
          status: o.payment.status,
          date: o.payment.paidAt || o.createdAt
        })),
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/payment/stats/overview
// @desc    Get payment statistics
// @access  Private/Admin
router.get('/stats/overview', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's revenue
    const todayRevenue = await Order.aggregate([
      { $match: {
          'payment.status': 'completed',
          createdAt: { $gte: today, $lt: tomorrow }
        }
      },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    // Total revenue
    const totalRevenue = await Order.aggregate([
      { $match: { 'payment.status': 'completed' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    // Payment method breakdown
    const methodBreakdown = await Order.aggregate([
      { $match: { 'payment.status': 'completed' } },
      {
        $group: {
          _id: '$payment.method',
          count: { $sum: 1 },
          total: { $sum: '$total' }
        }
      }
    ]);

    // Pending payments
    const pendingPayments = await Order.countDocuments({
      'payment.status': 'pending'
    });

    res.json({
      success: true,
      data: {
        todayRevenue: todayRevenue[0]?.total || 0,
        totalRevenue: totalRevenue[0]?.total || 0,
        methodBreakdown,
        pendingPayments
      }
    });
  } catch (error) {
    console.error('Payment stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
