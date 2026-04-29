import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const feedbackSchema = new mongoose.Schema(
  {
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
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      default: 'CHATBOT',
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'RESPONDED'],
      default: 'OPEN',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    response: {
      message: {
        type: String,
        trim: true,
        default: '',
      },
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      respondedAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.FEEDBACKS || 'feedbacks',
  }
);

feedbackSchema.index({ businessId: 1, createdAt: -1 });
feedbackSchema.index({ tenantId: 1, assignedTo: 1, status: 1, createdAt: -1 });

export default mongoose.model('Feedback', feedbackSchema);
