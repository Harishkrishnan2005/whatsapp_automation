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
  price: {
    type: Number,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['PAID', 'FAILED', 'PENDING'],
    default: 'PENDING'
  },
  razorpayOrderId: {
    type: String,
    required: true
  },
  razorpayPaymentId: {
    type: String
  },
  razorpaySignature: {
    type: String
  }
}, {
  timestamps: true,
  collection: COLLECTIONS.SUBSCRIPTIONS
});

export default mongoose.model('Subscription', subscriptionSchema);
