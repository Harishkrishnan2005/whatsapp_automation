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
  },
  service: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['BOOKED', 'CANCELLED', 'RESCHEDULED', 'COMPLETED'],
    default: 'BOOKED',
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
  },
}, {
  timestamps: true,
  collection: COLLECTIONS.APPOINTMENTS,
});

appointmentSchema.index({ businessId: 1, date: 1 });
appointmentSchema.index({ businessId: 1, customerId: 1, createdAt: -1 });

export default mongoose.model('Appointment', appointmentSchema);
