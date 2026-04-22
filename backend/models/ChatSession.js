import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const chatSessionSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    // currentNode: used by graph-based (visual) flows
    currentNode: {
      type: String,
      trim: true,
      default: 'start',
    },
    // currentStep: used by legacy step-based flows (PRIMARY)
    currentStep: {
      type: String,
      trim: true,
      default: 'start',
    },
    // When set, the next message is stored directly into collectedData[awaitingField]
    // without trigger matching.
    awaitingField: {
      type: String,
      default: null,
    },
    // Accumulated form data across conversation turns
    collectedData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Legacy: kept for backwards-compat with older code that uses session.context
    context: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    mode: {
      type: String,
      enum: ['BOT', 'HUMAN'],
      default: 'BOT',
    },
    lastInteractionAt: {
      type: Date,
      default: Date.now,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    isCancelled: {
      type: Boolean,
      default: false,
    },
    stepsCompleted: {
      type: [String],
      default: [],
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.CHAT_SESSIONS,
  }
);


chatSessionSchema.index({ businessId: 1, phone: 1 }, { unique: true });

export default mongoose.model('ChatSession', chatSessionSchema);
