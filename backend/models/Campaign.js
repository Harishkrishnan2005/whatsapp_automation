import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const campaignSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['TEXT', 'PRODUCT', 'TEMPLATE'],
    default: 'TEXT',
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }],
  templateName: String,
  audience: {
    type: String,
    enum: ['all', 'existing', 'new', 'custom'],
    default: 'all',
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'scheduled'],
    default: 'pending',
  },
  totalCustomers: {
    type: Number,
    default: 0,
  },
  sentCount: {
    type: Number,
    default: 0,
  },
  scheduledAt: {
    type: Date,
    default: Date.now,
  },
  sentAt: {
    type: Date,
  },
  deliveryStats: {
    delivered: { type: Number, default: 0 },
    read: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  },
}, {
  timestamps: true,
  collection: COLLECTIONS.CAMPAIGNS,
});

campaignSchema.index({ tenantId: 1, status: 1, scheduledAt: 1 });
campaignSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model('Campaign', campaignSchema);
