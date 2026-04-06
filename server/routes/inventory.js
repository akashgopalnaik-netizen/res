const express = require('express');
const { body, validationResult } = require('express-validator');
const { InventoryItem, Supplier, PurchaseOrder } = require('../models/Inventory');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// ============ INVENTORY ITEMS ============

// @route   GET /api/inventory/items
// @desc    Get all inventory items
// @access  Private
router.get('/items', protect, async (req, res) => {
  try {
    const { category, status, search, page = 1, limit = 50 } = req.query;

    const query = {};
    if (category) query.category = category;
    if (status) query.status = status;
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const items = await InventoryItem.find(query)
      .populate('supplier', 'name phone')
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await InventoryItem.countDocuments(query);

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get inventory items error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/inventory/items/low-stock
// @desc    Get low stock items
// @access  Private
router.get('/items/low-stock', protect, authorize('admin', 'manager', 'staff'), async (req, res) => {
  try {
    const items = await InventoryItem.find({
      $or: [
        { status: 'low-stock' },
        { status: 'out-of-stock' },
        { status: 'expiring-soon' }
      ]
    }).populate('supplier', 'name phone');

    res.json({ success: true, data: { items } });
  } catch (error) {
    console.error('Get low stock error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/inventory/items/:id
// @desc    Get inventory item by ID
// @access  Private
router.get('/items/:id', protect, async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id)
      .populate('supplier', 'name phone email');

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.json({ success: true, data: { item } });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/inventory/items
// @desc    Create inventory item
// @access  Private/Admin
router.post('/items', protect, authorize('admin', 'manager'), [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('sku').trim().notEmpty().withMessage('SKU is required'),
  body('category').isIn(['produce', 'meat', 'dairy', 'dry-goods', 'beverages', 'supplies', 'equipment']).withMessage('Invalid category'),
  body('unit').isIn(['kg', 'g', 'l', 'ml', 'pcs', 'box', 'case', 'dozen']).withMessage('Invalid unit'),
  body('minimumStock').isFloat({ min: 0 }).withMessage('Minimum stock must be non-negative'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const item = await InventoryItem.create(req.body);
      res.status(201).json({
        success: true,
        message: 'Inventory item created successfully',
        data: { item }
      });
    } catch (error) {
      console.error('Create item error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
]);

// @route   PUT /api/inventory/items/:id
// @desc    Update inventory item
// @access  Private/Admin
router.put('/items/:id', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const item = await InventoryItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('supplier', 'name phone');

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.json({
      success: true,
      message: 'Item updated successfully',
      data: { item }
    });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/inventory/items/:id/restock
// @desc    Restock inventory item
// @access  Private/Staff
router.put('/items/:id/restock', protect, authorize('admin', 'manager', 'staff'), [
  body('quantity').isFloat({ min: 0 }).withMessage('Quantity must be non-negative'),
  body('costPerUnit').optional().isFloat({ min: 0 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { quantity, costPerUnit } = req.body;
      const item = await InventoryItem.findById(req.params.id);

      if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found' });
      }

      item.currentStock += parseFloat(quantity);
      if (costPerUnit) item.costPerUnit = costPerUnit;
      item.lastRestocked = new Date();

      await item.save();

      res.json({
        success: true,
        message: 'Item restocked successfully',
        data: { item }
      });
    } catch (error) {
      console.error('Restock error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
]);

// @route   POST /api/inventory/items/:id/wastage
// @desc    Report wastage
// @access  Private/Staff
router.post('/items/:id/wastage', protect, authorize('admin', 'manager', 'staff'), [
  body('quantity').isFloat({ min: 0 }).withMessage('Quantity must be non-negative'),
  body('reason').isIn(['expired', 'damaged', 'spoiled', 'over-prepared', 'other']).withMessage('Invalid reason'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { quantity, reason, notes } = req.body;
      const item = await InventoryItem.findById(req.params.id);

      if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found' });
      }

      if (item.currentStock < quantity) {
        return res.status(400).json({ success: false, message: 'Insufficient stock' });
      }

      item.currentStock -= parseFloat(quantity);
      item.wastage.push({
        quantity: parseFloat(quantity),
        reason,
        reportedBy: req.user.id,
        notes: notes || ''
      });

      await item.save();

      res.json({
        success: true,
        message: 'Wastage recorded',
        data: { item }
      });
    } catch (error) {
      console.error('Report wastage error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
]);

// @route   DELETE /api/inventory/items/:id
// @desc    Delete inventory item
// @access  Private/Admin
router.delete('/items/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    await item.deleteOne();

    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============ SUPPLIERS ============

// @route   GET /api/inventory/suppliers
// @desc    Get all suppliers
// @access  Private
router.get('/suppliers', protect, async (req, res) => {
  try {
    const suppliers = await Supplier.find({ isActive: true })
      .populate('items', 'name sku currentStock')
      .sort({ name: 1 });

    res.json({ success: true, data: { suppliers } });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/inventory/suppliers
// @desc    Create supplier
// @access  Private/Admin
router.post('/suppliers', protect, authorize('admin', 'manager'), [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const supplier = await Supplier.create(req.body);
      res.status(201).json({
        success: true,
        message: 'Supplier created successfully',
        data: { supplier }
      });
    } catch (error) {
      console.error('Create supplier error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
]);

// @route   PUT /api/inventory/suppliers/:id
// @desc    Update supplier
// @access  Private/Admin
router.put('/suppliers/:id', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    res.json({
      success: true,
      message: 'Supplier updated successfully',
      data: { supplier }
    });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============ PURCHASE ORDERS ============

// @route   GET /api/inventory/purchase-orders
// @desc    Get purchase orders
// @access  Private
router.get('/purchase-orders', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    const orders = await PurchaseOrder.find(query)
      .populate('supplier', 'name phone')
      .populate('orderedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await PurchaseOrder.countDocuments(query);

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
    console.error('Get purchase orders error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/inventory/purchase-orders
// @desc    Create purchase order
// @access  Private/Admin
router.post('/purchase-orders', protect, authorize('admin', 'manager'), [
  body('supplier').notEmpty().withMessage('Supplier is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { supplier, items, expectedDate, notes } = req.body;

      // Calculate totals
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        const inventoryItem = await InventoryItem.findById(item.inventoryItem);
        const total = (item.quantity * inventoryItem.costPerUnit);
        subtotal += total;

        orderItems.push({
          inventoryItem: inventoryItem._id,
          name: inventoryItem.name,
          quantity: item.quantity,
          unitCost: inventoryItem.costPerUnit,
          total
        });
      }

      const tax = subtotal * 0.05; // 5% tax
      const total = subtotal + tax;

      const order = await PurchaseOrder.create({
        supplier,
        items: orderItems,
        subtotal,
        tax,
        total,
        expectedDate,
        notes,
        orderedBy: req.user.id,
        status: 'pending'
      });

      res.status(201).json({
        success: true,
        message: 'Purchase order created successfully',
        data: { order }
      });
    } catch (error) {
      console.error('Create purchase order error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
]);

// @route   PUT /api/inventory/purchase-orders/:id/receive
// @desc    Receive purchase order
// @access  Private/Staff
router.put('/purchase-orders/:id/receive', protect, authorize('admin', 'manager', 'staff'), async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id).populate('items.inventoryItem');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Update inventory quantities
    for (const item of order.items) {
      const inventoryItem = await InventoryItem.findById(item.inventoryItem._id);
      if (inventoryItem) {
        inventoryItem.currentStock += item.quantity;
        inventoryItem.lastRestocked = new Date();
        await inventoryItem.save();
      }
    }

    order.status = 'received';
    order.receivedDate = new Date();
    await order.save();

    res.json({
      success: true,
      message: 'Purchase order received successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Receive order error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/inventory/stats/overview
// @desc    Get inventory statistics
// @access  Private/Admin
router.get('/stats/overview', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const totalItems = await InventoryItem.countDocuments();
    const lowStockItems = await InventoryItem.countDocuments({ status: { $in: ['low-stock', 'out-of-stock'] } });
    const expiringSoon = await InventoryItem.countDocuments({ status: 'expiring-soon' });

    const categoryStats = await InventoryItem.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 }, totalValue: { $sum: { $multiply: ['$currentStock', '$costPerUnit'] } } } }
    ]);

    const totalValue = categoryStats.reduce((sum, cat) => sum + cat.totalValue, 0);

    const wastageStats = await InventoryItem.aggregate([
      { $unwind: '$wastage' },
      { $group: { _id: '$wastage.reason', totalQuantity: { $sum: '$wastage.quantity' } } }
    ]);

    res.json({
      success: true,
      data: {
        totalItems,
        lowStockItems,
        expiringSoon,
        totalValue,
        categoryStats,
        wastageStats
      }
    });
  } catch (error) {
    console.error('Inventory stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
