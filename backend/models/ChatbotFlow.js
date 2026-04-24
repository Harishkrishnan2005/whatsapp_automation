import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const chatbotFlowSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  },
  category: {
    type: String,
    enum: ['booking', 'ecommerce'],
    required: true,
    index: true,
  },
  step: {
    type: String,
    required: true,
    trim: true,
  },
  triggerKeywords: {
    type: [String],
    default: [],
  },
  responseTemplate: {
    type: String,
    required: true,
  },
  nextStep: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    default: 'NONE',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isSystem: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
  collection: COLLECTIONS.CHATBOT_FLOWS,
});

chatbotFlowSchema.index({ tenantId: 1, isActive: 1, isSystem: 1 });
chatbotFlowSchema.index({ tenantId: 1, step: 1 });


export default mongoose.model('ChatbotFlow', chatbotFlowSchema);
