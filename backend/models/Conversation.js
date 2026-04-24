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
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
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
  messages: [{
    senderId: { type: mongoose.Schema.Types.ObjectId, refPath: 'messages.senderModel' },
    senderModel: { type: String, enum: ['Customer', 'User'] },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' }
  }]
}, { 
  timestamps: true,
  collection: COLLECTIONS.CONVERSATIONS,
});

// Ensure unique conversation per phone + tenant
conversationSchema.index({ phone: 1, tenantId: 1 }, { unique: true });
conversationSchema.index({ tenantId: 1, updatedAt: -1 });
conversationSchema.index({ tenantId: 1, assignedStaffId: 1, updatedAt: -1 });
conversationSchema.index({ tenantId: 1, customerId: 1 });

export default mongoose.model('Conversation', conversationSchema);
