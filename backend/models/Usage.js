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
  flowsCreated: {
    type: Number,
    default: 0
  },
  resetDate: {
    type: Date,
    required: true
  }
}, {
  timestamps: true,
  collection: COLLECTIONS.USAGE
});

export default mongoose.model('Usage', usageSchema);
