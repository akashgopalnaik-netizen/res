const express = require('express');
const { body, validationResult } = require('express-validator');
const MenuItem = require('../models/MenuItem');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/menu
// @desc    Get all menu items (public with optional auth)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, subCategory, isFeatured, search, page = 1, limit = 20 } = req.query;

    const query = { isAvailable: true };

    if (category) query.category = category;
    if (subCategory) query.subCategory = subCategory;
    if (isFeatured) query.isFeatured = isFeatured === 'true';

    if (search) {
      query.$text = { $search: search };
    }

    const menuItems = await MenuItem.find(query)
      .sort({ displayOrder: 1, name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await MenuItem.countDocuments(query);

    res.json({
      success: true,
      data: {
        menuItems,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/menu/categories
// @desc    Get all categories with counts
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await MenuItem.aggregate([
      { $match: { isAvailable: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          items: { $push: { name: '$name', price: '$price', isFeatured: '$isFeatured' } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/menu/:id
// @desc    Get menu item by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    res.json({ success: true, data: { menuItem } });
  } catch (error) {
    console.error('Get menu item error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/menu
// @desc    Create menu item
// @access  Private/Admin
router.post('/', protect, authorize('admin', 'manager'), [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category').isIn(['appetizer', 'main', 'dessert', 'beverage', 'side', 'special']).withMessage('Invalid category'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const menuItem = await MenuItem.create(req.body);
      res.status(201).json({
        success: true,
        message: 'Menu item created successfully',
        data: { menuItem }
      });
    } catch (error) {
      console.error('Create menu item error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
]);

// @route   PUT /api/menu/:id
// @desc    Update menu item
// @access  Private/Admin
router.put('/:id', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    res.json({
      success: true,
      message: 'Menu item updated successfully',
      data: { menuItem }
    });
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/menu/:id
// @desc    Delete menu item (soft delete - set unavailable)
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      { isAvailable: false },
      { new: true }
    );

    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    res.json({ success: true, message: 'Menu item removed successfully' });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/menu/:id/toggle-availability
// @desc    Toggle menu item availability
// @access  Private/Staff
router.put('/:id/toggle-availability', protect, authorize('admin', 'manager', 'staff'), async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    menuItem.isAvailable = !menuItem.isAvailable;
    await menuItem.save();

    res.json({
      success: true,
      message: `Menu item ${menuItem.isAvailable ? 'available' : 'unavailable'}`,
      data: { menuItem }
    });
  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/menu/:id/rating
// @desc    Add/update rating for menu item
// @access  Public (authenticated)
router.post('/:id/rating', protect, async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    // Simple rating calculation
    const totalRatings = menuItem.ratings.count;
    const currentAverage = menuItem.ratings.average;

    menuItem.ratings.average = ((currentAverage * totalRatings) + rating) / (totalRatings + 1);
    menuItem.ratings.count += 1;
    await menuItem.save();

    res.json({
      success: true,
      message: 'Rating submitted successfully',
      data: { average: menuItem.ratings.average, count: menuItem.ratings.count }
    });
  } catch (error) {
    console.error('Add rating error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/menu/stats/overview
// @desc    Get menu statistics
// @access  Private/Admin
router.get('/stats/overview', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const totalItems = await MenuItem.countDocuments();
    const availableItems = await MenuItem.countDocuments({ isAvailable: true });
    const featuredItems = await MenuItem.countDocuments({ isFeatured: true });

    const categoryStats = await MenuItem.aggregate([
      { $match: { isAvailable: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalItems,
        availableItems,
        featuredItems,
        categoryStats
      }
    });
  } catch (error) {
    console.error('Menu stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
