import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const noteSchema = new mongoose.Schema({
  text: { type: String, required: true },
  // Legacy appointments may have imported notes without a recorded author.
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now }
});

const auditLogSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['CREATED', 'NOTE_ADDED', 'STATUS_CHANGED', 'STAFF_ASSIGNED', 'RESCHEDULED'], 
    required: true 
  },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
});

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
    enum: ['BOOKED', 'CONFIRMED', 'CANCELLED', 'RESCHEDULED', 'COMPLETED', 'PENDING'],
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
  notes: [noteSchema],
  auditLogs: [auditLogSchema],
}, {
  timestamps: true,
  collection: COLLECTIONS.APPOINTMENTS,
});

// Standard lookup indexes
appointmentSchema.index({ businessId: 1, date: 1 });
appointmentSchema.index({ businessId: 1, customerId: 1, createdAt: -1 });
appointmentSchema.index({ assignedTo: 1, date: 1 });

// Unique constraint: prevent double-booking the same slot per business
appointmentSchema.index({ businessId: 1, date: 1, time: 1 }, {
  unique: true,
  partialFilterExpression: { status: { $in: ['BOOKED', 'RESCHEDULED'] } },
});

export default mongoose.model('Appointment', appointmentSchema);
