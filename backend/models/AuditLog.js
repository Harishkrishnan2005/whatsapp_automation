import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const auditLogSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: ['LOGIN', 'LOGOUT', 'BOOKING_CREATED', 'BOOKING_UPDATED', 'ORDER_CREATED', 'ORDER_UPDATED', 'TICKET_CREATED', 'TICKET_UPDATED', 'STAFF_CREATED', 'STAFF_DELETED']
  },
  resourceType: {
    type: String,
    required: true,
    enum: ['USER', 'ORDER', 'APPOINTMENT', 'SUPPORT_TICKET', 'CUSTOMER']
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: { createdAt: true, updatedAt: false },
  collection: COLLECTIONS.AUDIT_LOGS || 'audit_logs'
});

export default mongoose.model('AuditLog', auditLogSchema);
