const express = require('express');
const Order = require('../models/Order');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');
const Reservation = require('../models/Reservation');
const { InventoryItem } = require('../models/Inventory');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/dashboard/overview
// @desc    Get complete dashboard overview
// @access  Private/Admin
router.get('/overview', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Orders stats
    const totalOrders = await Order.countDocuments();
    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const preparingOrders = await Order.countDocuments({ status: 'preparing' });

    // Revenue stats
    const todayRevenue = await Order.aggregate([
      { $match: {
          'payment.status': 'completed',
          createdAt: { $gte: today, $lt: tomorrow }
        }
      },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const totalRevenue = await Order.aggregate([
      { $match: { 'payment.status': 'completed' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    // Table stats
    const totalTables = await Table.countDocuments();
    const occupiedTables = await Table.countDocuments({ status: 'occupied' });
    const availableTables = await Table.countDocuments({ status: 'available' });

    // Reservation stats
    const todayReservations = await Reservation.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      status: { $in: ['pending', 'confirmed', 'seated'] }
    });

    // Customer stats
    const totalCustomers = await User.countDocuments({ role: 'customer', isActive: true });

    // Menu stats
    const totalMenuItems = await MenuItem.countDocuments();
    const availableItems = await MenuItem.countDocuments({ isAvailable: true });

    // Low inventory alert
    const lowStockCount = await InventoryItem.countDocuments({
      status: { $in: ['low-stock', 'out-of-stock'] }
    });

    res.json({
      success: true,
      data: {
        orders: {
          total: totalOrders,
          today: todayOrders,
          pending: pendingOrders,
          preparing: preparingOrders
        },
        revenue: {
          today: todayRevenue[0]?.total || 0,
          total: totalRevenue[0]?.total || 0
        },
        tables: {
          total: totalTables,
          occupied: occupiedTables,
          available: availableTables,
          utilization: totalTables > 0 ? ((occupiedTables / totalTables) * 100).toFixed(1) : 0
        },
        reservations: {
          today: todayReservations
        },
        customers: {
          total: totalCustomers
        },
        menu: {
          total: totalMenuItems,
          available: availableItems
        },
        inventory: {
          lowStock: lowStockCount
        }
      }
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/dashboard/revenue-chart
// @desc    Get revenue data for chart
// @access  Private/Admin
router.get('/revenue-chart', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { period = '7days' } = req.query;
    const now = new Date();
    let startDate;

    switch (period) {
      case '24hours':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const revenueData = await Order.aggregate([
      { $match: {
          'payment.status': 'completed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: { revenueData }
    });
  } catch (error) {
    console.error('Revenue chart error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/dashboard/popular-items
// @desc    Get most popular menu items
// @access  Private/Admin
router.get('/popular-items', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const popularItems = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menuItem',
          name: { $first: '$items.name' },
          totalQuantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json({
      success: true,
      data: { popularItems }
    });
  } catch (error) {
    console.error('Popular items error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/dashboard/order-status
// @desc    Get order status distribution
// @access  Private/Admin
router.get('/order-status', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const statusData = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: { statusData }
    });
  } catch (error) {
    console.error('Order status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/dashboard/recent-orders
// @desc    Get recent orders for dashboard
// @access  Private
router.get('/recent-orders', protect, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const query = {};
    if (req.user.role === 'customer') {
      query.customer = req.user.id;
    }

    const orders = await Order.find(query)
      .populate('customer', 'name email')
      .populate('items.menuItem', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: { orders }
    });
  } catch (error) {
    console.error('Recent orders error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/dashboard/table-status
// @desc    Get table status for dashboard
// @access  Private
router.get('/table-status', protect, async (req, res) => {
  try {
    const tables = await Table.find()
      .populate('currentOrder', 'orderNumber status total')
      .sort({ section: 1, tableNumber: 1 });

    res.json({
      success: true,
      data: { tables }
    });
  } catch (error) {
    console.error('Table status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/dashboard/today-reservations
// @desc    Get today's reservations
// @access  Private
router.get('/today-reservations', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const query = {
      date: { $gte: today, $lt: tomorrow },
      status: { $in: ['pending', 'confirmed', 'seated'] }
    };

    if (req.user.role === 'customer') {
      query.customer = req.user.id;
    }

    const reservations = await Reservation.find(query)
      .populate('customer', 'name email phone')
      .populate('table', 'tableNumber section')
      .sort({ time: 1 });

    res.json({
      success: true,
      data: { reservations }
    });
  } catch (error) {
    console.error('Today reservations error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/dashboard/alerts
// @desc    Get system alerts
// @access  Private/Staff
router.get('/alerts', protect, authorize('admin', 'manager', 'staff'), async (req, res) => {
  try {
    const alerts = [];

    // Low stock alerts
    const lowStockItems = await InventoryItem.find({
      status: { $in: ['low-stock', 'out-of-stock'] }
    }).select('name sku currentStock minimumStock status');

    if (lowStockItems.length > 0) {
      alerts.push({
        type: 'inventory',
        priority: 'high',
        message: `${lowStockItems.length} items need restocking`,
        items: lowStockItems
      });
    }

    // Expiring soon alerts
    const expiringItems = await InventoryItem.find({ status: 'expiring-soon' })
      .select('name sku expiryDate');

    if (expiringItems.length > 0) {
      alerts.push({
        type: 'expiry',
        priority: 'medium',
        message: `${expiringItems.length} items expiring soon`,
        items: expiringItems
      });
    }

    // Pending orders alert
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    if (pendingOrders > 0) {
      alerts.push({
        type: 'orders',
        priority: 'high',
        message: `${pendingOrders} orders pending`,
        count: pendingOrders
      });
    }

    // Pending reservations
    const pendingReservations = await Reservation.countDocuments({
      status: 'pending',
      date: { $gte: new Date() }
    });
    if (pendingReservations > 0) {
      alerts.push({
        type: 'reservations',
        priority: 'medium',
        message: `${pendingReservations} reservations pending confirmation`,
        count: pendingReservations
      });
    }

    res.json({
      success: true,
      data: { alerts }
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
