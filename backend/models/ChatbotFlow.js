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
    enum: [
      'NONE',
      'SHOW_PRODUCTS',
      'CREATE_ORDER',
      'PROCESS_PAYMENT',
      'CANCEL_ORDER',
      'RETURN_ORDER',
      'SAVE_NAME',
      'SAVE_PRODUCT',
      'BOOK_APPOINTMENT',
      'CREATE_FEEDBACK',
      'START_SUPPORT',
      'CREATE_SUPPORT',
    ],
    default: 'NONE',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
  },
}, {
  timestamps: true,
  collection: COLLECTIONS.CHATBOT_FLOWS,
});

chatbotFlowSchema.index({ businessId: 1, step: 1, trigger: 1 });

export default mongoose.model('ChatbotFlow', chatbotFlowSchema);
