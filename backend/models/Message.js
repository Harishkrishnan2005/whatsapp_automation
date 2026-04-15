import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const messageSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['incoming', 'outgoing'],
    required: true,
  },
  senderType: {
    type: String,
    enum: ['customer', 'chatbot', 'staff', 'admin'],
    default: 'customer',
  },
  products: [{
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    mrp: Number,
    offerPrice: Number,
    offerPercentage: Number,
    unitType: String,
    category: String,
    image: String,
    redirectUrl: String,
  }],
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    default: null,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
  },
}, {
  timestamps: true,
  collection: COLLECTIONS.MESSAGES,
});

messageSchema.index({ businessId: 1, customerId: 1, createdAt: -1 });
messageSchema.index({ businessId: 1, campaignId: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);
