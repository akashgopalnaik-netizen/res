const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  tableNumber: {
    type: Number,
    required: [true, 'Please provide a table number'],
    unique: true
  },
  name: {
    type: String,
    trim: true
  },
  section: {
    type: String,
    enum: ['indoor', 'outdoor', 'patio', 'vip', 'bar'],
    default: 'indoor'
  },
  capacity: {
    type: Number,
    required: [true, 'Please provide capacity'],
    min: 1
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'maintenance'],
    default: 'available'
  },
  currentOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  assignedServer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  position: {
    x: Number,
    y: Number
  },
  features: [{
    type: String,
    enum: ['window', 'booth', 'wheelchair-accessible', 'high-chair', 'private']
  }],
  qrCode: {
    type: String
  },
  isCombinable: {
    type: Boolean,
    default: false
  },
  combinableWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table'
  }],
  notes: String
}, {
  timestamps: true
});

tableSchema.index({ status: 1, section: 1 });
tableSchema.index({ tableNumber: 1 });

module.exports = mongoose.model('Table', tableSchema);
