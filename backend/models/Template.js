import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

/**
 * Template Schema
 * Predefined flow templates that businesses can use
 */
const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    enum: ['booking', 'ecommerce', 'support', 'feedback', 'lead-capture'],
  },
  description: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    enum: ['booking', 'ecommerce', 'support', 'feedback', 'lead'],
    required: true,
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  },
  // Flow definitions that will be created
  flows: [
    {
      trigger: {
        type: String,
        required: true,
      },
      reply: {
        type: String,
        required: true,
      },
      step: {
        type: String,
        required: true,
      },
      nextStep: {
        type: String,
        required: true,
      },
      action: {
        type: String,
        default: 'JUST_SEND_REPLY',
      },
    },
  ],
  // Metadata
  minPlan: {
    type: String,
    enum: ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'],
    default: 'BASIC',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
  collection: COLLECTIONS.TEMPLATES || 'templates',
});

export default mongoose.model('Template', templateSchema);
