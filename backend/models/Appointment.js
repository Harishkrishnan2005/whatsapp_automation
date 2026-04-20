import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const appointmentSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
    trim: true,
  },
  service: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['BOOKED', 'CANCELLED', 'RESCHEDULED', 'COMPLETED'],
    default: 'BOOKED',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
}, {
  timestamps: true,
  collection: COLLECTIONS.APPOINTMENTS,
});

// Standard lookup indexes
appointmentSchema.index({ businessId: 1, date: 1 });
appointmentSchema.index({ businessId: 1, customerId: 1, createdAt: -1 });
// Unique constraint: prevent double-booking the same slot per business
appointmentSchema.index({ businessId: 1, date: 1, time: 1 }, {
  unique: true,
  partialFilterExpression: { status: { $in: ['BOOKED', 'RESCHEDULED'] } },
});

export default mongoose.model('Appointment', appointmentSchema);
