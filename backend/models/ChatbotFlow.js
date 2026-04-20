import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const chatbotFlowSchema = new mongoose.Schema({
  trigger: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  reply: {
    type: String,
    required: true,
    trim: true,
  },
  step: {
    type: String,
    required: true,
    trim: true,
  },
  nextStep: {
    type: String,
    required: true,
    trim: true,
  },
  action: {
    type: String,
    default: 'JUST_SEND_REPLY',
  },
  nodes: [
    {
      id: {
        type: String,
        required: true,
        trim: true,
      },
      type: {
        type: String,
        trim: true,
        default: 'message',
      },
      data: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
  ],
  edges: [
    {
      source: {
        type: String,
        required: true,
        trim: true,
      },
      target: {
        type: String,
        required: true,
        trim: true,
      },
      label: {
        type: String,
        trim: true,
        default: '',
      },
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
  },
  category: {
    type: String,
    enum: ['booking', 'ecommerce'],
    index: true,
  },
}, {
  timestamps: true,
  collection: COLLECTIONS.CHATBOT_FLOWS,
});

chatbotFlowSchema.index({ businessId: 1, step: 1, trigger: 1 });

export default mongoose.model('ChatbotFlow', chatbotFlowSchema);
