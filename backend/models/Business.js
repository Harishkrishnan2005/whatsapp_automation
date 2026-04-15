import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';
import { BUSINESS_TYPES } from './User.js';

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
  businessType: {
    type: String,
    enum: BUSINESS_TYPES,
    default: 'E_COMMERCE',
    required: true,
  },
}, {
  timestamps: true,
  collection: COLLECTIONS.BUSINESSES,
});

export default mongoose.model('Business', businessSchema);
