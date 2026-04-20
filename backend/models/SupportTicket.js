import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const supportTicketSchema = new mongoose.Schema(
  {
    businessId: {
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
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'],
      default: 'OPEN',
    },
    replies: [
      {
        sender: {
          type: String,
          enum: ['admin', 'super_admin', 'bot', 'customer'],
          required: true,
        },
        message: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
    collection: COLLECTIONS.SUPPORT_TICKETS || 'support_tickets',
  }
);

supportTicketSchema.index({ businessId: 1, status: 1 });
supportTicketSchema.index({ businessId: 1, customerId: 1 });

export default mongoose.model('SupportTicket', supportTicketSchema);
