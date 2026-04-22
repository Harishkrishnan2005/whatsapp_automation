import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

/**
 * Session Schema for Multi-Tenant Chatbot
 * 
 * Production Features:
 * - Unique index on (phone, businessId) for multi-tenant isolation
 * - TTL index on updatedAt (optional: 24 hours auto-cleanup)
 * - Context storage for dynamic conversation state
 * - Last message tracking for debugging
 * - Timestamps for audit trail
 */

const sessionSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  },
  currentStep: {
    type: String,
    default: 'start',
  },
  collectedData: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  lastInteractionAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  collection: COLLECTIONS.SESSIONS,
});

// =====================
// INDEXES (Production)
// =====================

// Unique compound index: (phone, businessId) for multi-tenant isolation
sessionSchema.index(
  { phone: 1, businessId: 1 },
  { unique: true, name: 'phone_businessId_unique' }
);

// TTL Index: Auto-delete expired sessions after 24 hours of inactivity
// MongoDB will automatically remove documents where updatedAt < current_time - 24 hours
sessionSchema.index(
  { updatedAt: 1 },
  {
    expireAfterSeconds: 86400, // 24 hours in seconds
    name: 'session_ttl_24h',
  }
);

// Performance indexes
sessionSchema.index({ businessId: 1, step: 1 }, { name: 'businessId_step' });
sessionSchema.index({ phone: 1 }, { name: 'phone' });

export default mongoose.model('Session', sessionSchema);
