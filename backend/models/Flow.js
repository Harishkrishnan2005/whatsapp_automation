import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const flowSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  },
  trigger: {
    type: [String],
    default: [],
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
  reply: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    default: 'NONE',
  },
  responseType: {
    type: String,
    enum: ['TEXT', 'TEMPLATE'],
    default: 'TEXT',
  },
  templateName: {
    type: String,
    trim: true,
    uppercase: true,
    default: '',
  },
  variableMapping: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  order: {
    type: Number,
    default: 1,
  }
}, {
  timestamps: true,
  collection: COLLECTIONS.FLOWS || 'flows',
});

flowSchema.index({ businessId: 1, step: 1 });
flowSchema.index({ businessId: 1, trigger: 1 });

export default mongoose.model('Flow', flowSchema);
