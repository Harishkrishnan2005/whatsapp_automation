import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const chatTemplateSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    default: null,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
  },
  category: {
    type: String,
    enum: ['UTILITY', 'MARKETING', 'AUTH'],
    default: 'UTILITY',
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  variables: {
    type: [String],
    default: [],
  },
  status: {
    type: String,
    enum: ['APPROVED', 'PENDING', 'REJECTED'],
    default: 'PENDING',
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
  collection: COLLECTIONS.CHAT_TEMPLATES,
});

chatTemplateSchema.index(
  { businessId: 1, name: 1 },
  { unique: true, partialFilterExpression: { businessId: { $type: 'objectId' } } }
);
chatTemplateSchema.index(
  { name: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { businessId: null, isDefault: true } }
);

export default mongoose.model('ChatTemplate', chatTemplateSchema);
