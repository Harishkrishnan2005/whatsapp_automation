import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const usageSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    unique: true,
    index: true
  },
  messagesUsed: {
    type: Number,
    default: 0
  },
  flowsUsed: {
    type: Number,
    default: 0
  },
  lastResetDate: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: COLLECTIONS.USAGE
});

export default mongoose.model('Usage', usageSchema);
