import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const businessSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  plan: {
    type: String,
    enum: ['Free', 'Pro'],
    default: 'Free',
  },
}, {
  timestamps: true,
  collection: COLLECTIONS.BUSINESSES,
});

export default mongoose.model('Business', businessSchema);
