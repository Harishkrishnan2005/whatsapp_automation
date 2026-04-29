import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const messageTemplateSchema = new mongoose.Schema(
  {
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
      enum: ['UTILITY', 'AUTH', 'MARKETING'],
      required: true,
      default: 'UTILITY',
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
  },
  {
    timestamps: true,
    collection: COLLECTIONS.CHAT_TEMPLATES,
  }
);

messageTemplateSchema.index(
  { businessId: 1, name: 1 },
  { unique: true, partialFilterExpression: { businessId: { $type: 'objectId' } } }
);
messageTemplateSchema.index(
  { name: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { businessId: null, isDefault: true } }
);

export default mongoose.model('MessageTemplate', messageTemplateSchema);
