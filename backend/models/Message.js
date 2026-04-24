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
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent',
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'senderModel',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'receiverModel',
    required: true
  },
  senderModel: { type: String, enum: ['Customer', 'User'], required: true },
  receiverModel: { type: String, enum: ['Customer', 'User'], required: true },
  content: { type: String, required: true },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true }
}, {
  timestamps: true,
  collection: COLLECTIONS.MESSAGES,
});

messageSchema.index({ tenantId: 1, customerId: 1, createdAt: -1 });
messageSchema.index({ tenantId: 1, campaignId: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);
