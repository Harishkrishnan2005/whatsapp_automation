import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const chatAssignmentSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['assigned', 'in_progress', 'closed'],
    default: 'assigned',
  },
  notes: {
    type: String,
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  },
}, {
  timestamps: true,
  collection: COLLECTIONS.CHAT_ASSIGNMENTS,
});

chatAssignmentSchema.index({ tenantId: 1, status: 1, updatedAt: -1 });

export default mongoose.model('ChatAssignment', chatAssignmentSchema);
