import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const campaignSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['TEXT', 'PRODUCT'],
    default: 'TEXT',
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }],
  audience: {
    type: String,
    enum: ['all', 'existing'],
    default: 'all',
  },
  totalCustomers: {
    type: Number,
    default: 0,
  },
  sentCount: {
    type: Number,
    default: 0,
  },
  convertedCount: {
    type: Number,
    default: 0,
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
  },
}, {
  timestamps: true,
  collection: COLLECTIONS.CAMPAIGNS,
});

campaignSchema.index({ businessId: 1, createdAt: -1 });

export default mongoose.model('Campaign', campaignSchema);
