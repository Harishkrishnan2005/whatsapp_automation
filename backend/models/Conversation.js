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
  assignedTo: {
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
  messages: [conversationMessageSchema]
}, { 
  timestamps: true,
  collection: COLLECTIONS.CONVERSATIONS,
});

// Ensure unique conversation per phone + tenant
conversationSchema.index({ phone: 1, tenantId: 1 }, { unique: true });
conversationSchema.index({ tenantId: 1, updatedAt: -1 });
conversationSchema.index({ tenantId: 1, assignedStaffId: 1, updatedAt: -1 });
conversationSchema.index({ tenantId: 1, assignedTo: 1, updatedAt: -1 });
conversationSchema.index({ tenantId: 1, customerId: 1 });

conversationSchema.pre('validate', function syncAssignmentFields(next) {
  if (this.assignedTo && !this.assignedStaffId) {
    this.assignedStaffId = this.assignedTo;
  }

  if (this.assignedStaffId && !this.assignedTo) {
    this.assignedTo = this.assignedStaffId;
  }

  next();
});

export default mongoose.model('Conversation', conversationSchema);
