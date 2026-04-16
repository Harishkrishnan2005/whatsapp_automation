import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const chatSessionSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    currentNode: {
      type: String,
      required: true,
      trim: true,
      default: 'start',
    },
    context: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.CHAT_SESSIONS,
  }
);

chatSessionSchema.index({ businessId: 1, phone: 1 }, { unique: true });

export default mongoose.model('ChatSession', chatSessionSchema);
