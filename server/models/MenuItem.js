const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide a description']
  },
  category: {
    type: String,
    required: [true, 'Please provide a category'],
    enum: ['appetizer', 'main', 'dessert', 'beverage', 'side', 'special']
  },
  subCategory: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: [true, 'Please provide a price'],
    min: 0
  },
  cost: {
    type: Number,
    default: 0,
    min: 0
  },
  images: [{
    url: String,
    isPrimary: Boolean
  }],
  isAvailable: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isVeg: {
    type: Boolean,
    default: true
  },
  isSpicy: {
    type: Boolean,
    default: false
  },
  allergens: [String],
  ingredients: [String],
  nutritionInfo: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
    fiber: Number
  },
  preparationTime: {
    type: Number,
    default: 15,
    min: 0
  },
  inventory: {
    trackInventory: { type: Boolean, default: false },
    quantity: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 5 }
  },
  modifiers: [{
    name: String,
    options: [{
      name: String,
      price: Number,
      isDefault: Boolean
    }],
    required: Boolean,
    multiple: Boolean
  }],
  ratings: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  tags: [String],
  displayOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
menuItemSchema.index({ category: 1, isAvailable: 1, displayOrder: 1 });
menuItemSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('MenuItem', menuItemSchema);
