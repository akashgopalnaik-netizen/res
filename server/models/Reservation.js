const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  reservationNumber: {
    type: String,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  partySize: {
    type: Number,
    required: true,
    min: 1
  },
  table: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table'
  },
  assignedTableNumber: Number,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show'],
    default: 'pending'
  },
  occasion: {
    type: String,
    enum: ['none', 'birthday', 'anniversary', 'business', 'celebration', 'other']
  },
  specialRequests: String,
  seatingPreference: {
    type: String,
    enum: ['any', 'indoor', 'outdoor', 'patio', 'vip', 'quiet', 'window']
  },
  remindersSent: {
    sms: { type: Boolean, default: false },
    email: { type: Boolean, default: false }
  },
  notes: String,
  source: {
    type: String,
    enum: ['online', 'phone', 'walk-in', 'app'],
    default: 'online'
  },
  checkInTime: Date,
  checkOutTime: Date,
  noShowFee: {
    type: Number,
    default: 0
  },
  deposit: {
    amount: Number,
    paid: { type: Boolean, default: false },
    paymentId: String
  }
}, {
  timestamps: true
});

// Generate reservation number
reservationSchema.pre('validate', async function(next) {
  if (!this.reservationNumber) {
    const count = await mongoose.model('Reservation').countDocuments();
    this.reservationNumber = `RES-${Date.now().toString(36).toUpperCase()}-${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

// Index for efficient queries
reservationSchema.index({ date: 1, time: 1 });
reservationSchema.index({ customer: 1, createdAt: -1 });
reservationSchema.index({ status: 1, date: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
