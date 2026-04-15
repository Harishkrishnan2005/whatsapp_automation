import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const quickReplySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
  },
}, {
  timestamps: true,
  collection: COLLECTIONS.QUICK_REPLIES,
});

quickReplySchema.index({ businessId: 1, createdAt: -1 });

export default mongoose.model('QuickReply', quickReplySchema);
