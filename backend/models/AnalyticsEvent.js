import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const analyticsEventSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    index: true,
  },
  eventType: {
    type: String,
    enum: ['flow_start', 'flow_step_reach', 'flow_drop_off', 'conversion', 'order_start', 'order_complete'],
    required: true,
    index: true,
  },
  eventData: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  source: {
    type: String,
    enum: ['chatbot', 'web', 'manual'],
    default: 'chatbot',
  },
}, {
  timestamps: true,
  collection: 'analytics_events',
});

// For funnel analysis
analyticsEventSchema.index({ businessId: 1, eventType: 1, createdAt: -1 });

export default mongoose.model('AnalyticsEvent', analyticsEventSchema);
