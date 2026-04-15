import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const chatTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['promotion', 'reminder', 'support', 'other'],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  collection: COLLECTIONS.CHAT_TEMPLATES,
});

chatTemplateSchema.index({ category: 1, createdAt: -1 });

export default mongoose.model('ChatTemplate', chatTemplateSchema);
