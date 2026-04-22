import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const conversationMessageSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true,
    enum: ['customer', 'bot', 'admin', 'staff']
  },
  text: {
    type: String,
    required: true,
    trim: true,
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const conversationSchema = new mongoose.Schema({
  phone: { 
    type: String, 
    required: true,
    trim: true,
    set: (value) => String(value || '').trim(),
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null,
  },
  assignedStaffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  businessId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Business', 
    required: true 
  },
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active',
  },
  lastMessage: {
    type: String,
    trim: true,
    default: '',
  },
  lastMessageAt: {
    type: Date,
    default: null,
  },
  messages: [conversationMessageSchema]
}, { 
  timestamps: true,
  collection: COLLECTIONS.CONVERSATIONS,
});

// Ensure unique conversation per phone + business
conversationSchema.index({ phone: 1, businessId: 1 }, { unique: true });
conversationSchema.index({ businessId: 1, updatedAt: -1 });
conversationSchema.index({ businessId: 1, assignedStaffId: 1, updatedAt: -1 });
conversationSchema.index({ businessId: 1, customerId: 1 });

export default mongoose.model('Conversation', conversationSchema);
