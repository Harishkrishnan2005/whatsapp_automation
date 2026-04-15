import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['new_message', 'new_order', 'new_appointment', 'assignment', 'other'],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
  },
}, {
  timestamps: true,
  collection: COLLECTIONS.NOTIFICATIONS,
});

notificationSchema.index({ businessId: 1, userId: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
