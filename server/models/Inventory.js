const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide item name'],
    trim: true
  },
  sku: {
    type: String,
    unique: true,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['produce', 'meat', 'dairy', 'dry-goods', 'beverages', 'supplies', 'equipment']
  },
  unit: {
    type: String,
    required: true,
    enum: ['kg', 'g', 'l', 'ml', 'pcs', 'box', 'case', 'dozen']
  },
  currentStock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  minimumStock: {
    type: Number,
    required: true,
    default: 10
  },
  maximumStock: {
    type: Number,
    default: 1000
  },
  reorderPoint: {
    type: Number,
    default: 20
  },
  costPerUnit: {
    type: Number,
    default: 0
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  supplierName: String,
  location: {
    type: String,
    default: 'main-storage'
  },
  expiryDate: Date,
  batchNumber: String,
  lastRestocked: Date,
  linkedMenuItems: [{
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    quantityPerServing: Number
  }],
  wastage: [{
    quantity: Number,
    reason: {
      type: String,
      enum: ['expired', 'damaged', 'spoiled', 'over-prepared', 'other']
    },
    date: { type: Date, default: Date.now },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String
  }],
  isTracked: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['in-stock', 'low-stock', 'out-of-stock', 'expiring-soon'],
    default: 'in-stock'
  }
}, {
  timestamps: true
});

// Update status before save
inventoryItemSchema.pre('save', function(next) {
  if (this.currentStock <= 0) {
    this.status = 'out-of-stock';
  } else if (this.currentStock <= this.minimumStock) {
    this.status = 'low-stock';
  } else {
    this.status = 'in-stock';
  }

  // Check expiry
  if (this.expiryDate) {
    const daysUntilExpiry = (this.expiryDate - new Date()) / (1000 * 60 * 60 * 24);
    if (daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
      this.status = 'expiring-soon';
    }
  }

  next();
});

inventoryItemSchema.index({ sku: 1, category: 1, status: 1 });

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  contactPerson: String,
  email: String,
  phone: {
    type: String,
    required: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  items: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem'
  }],
  paymentTerms: String,
  leadTimeDays: {
    type: Number,
    default: 3
  },
  rating: {
    type: Number,
    default: 5,
    min: 1,
    max: 5
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const purchaseOrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  items: [{
    inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
    name: String,
    quantity: { type: Number, required: true },
    unitCost: Number,
    total: Number
  }],
  subtotal: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'ordered', 'partial', 'received', 'cancelled'],
    default: 'pending'
  },
  expectedDate: Date,
  receivedDate: Date,
  notes: String,
  orderedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

purchaseOrderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('PurchaseOrder').countDocuments();
    this.orderNumber = `PO-${Date.now().toString(36).toUpperCase()}-${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

module.exports = {
  InventoryItem: mongoose.model('InventoryItem', inventoryItemSchema),
  Supplier: mongoose.model('Supplier', supplierSchema),
  PurchaseOrder: mongoose.model('PurchaseOrder', purchaseOrderSchema)
};
