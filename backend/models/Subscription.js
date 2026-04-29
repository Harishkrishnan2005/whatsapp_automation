import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const subscriptionSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  },
  plan: {
    type: String,
    enum: ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'],
    required: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'],
    default: 'ACTIVE'
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  paymentId: {
    type: String,
    default: ''
  },
  amount: {
    type: Number,
    required: true
  }
}, {
  timestamps: true,
  collection: COLLECTIONS.SUBSCRIPTIONS
});

export default mongoose.model('Subscription', subscriptionSchema);
