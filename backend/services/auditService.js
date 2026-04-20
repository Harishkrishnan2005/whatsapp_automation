import AuditLog from '../models/AuditLog.js';
import logger from '../utils/logger.js';

/**
 * Audit Service for logging system actions
 */
class AuditService {
  /**
   * Log an action to the audit trail
   * @param {Object} data 
   * @param {string} data.businessId
   * @param {string} data.userId
   * @param {string} data.action - enum: ['LOGIN', 'LOGOUT', 'BOOKING_CREATED', 'BOOKING_UPDATED', 'ORDER_CREATED', 'ORDER_UPDATED', ...]
   * @param {string} data.resourceType - enum: ['USER', 'ORDER', 'APPOINTMENT', 'SUPPORT_TICKET', 'CUSTOMER']
   * @param {string} data.resourceId
   * @param {Object} data.details
   * @param {Object} data.req - Express req object for IP and Agent
   */
  static async log({ businessId, userId, action, resourceType, resourceId, details = {}, req = null }) {
    try {
      const logData = {
        businessId,
        userId,
        action,
        resourceType,
        resourceId,
        details,
        ipAddress: req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null,
        userAgent: req ? req.headers['user-agent'] : null
      };

      const auditEntry = new AuditLog(logData);
      await auditEntry.save();
      
      logger.info(`Audit Log: ${action} on ${resourceType} by ${userId}`, { action, resourceType, resourceId });
      
      return auditEntry;
    } catch (error) {
      logger.error('Failed to save audit log:', error);
      // We don't throw here to avoid breaking the main request flow
    }
  }

  // Pre-defined helper methods
  static async logLogin(user, req) {
    return this.log({
      businessId: user.businessId,
      userId: user._id,
      action: 'LOGIN',
      resourceType: 'USER',
      resourceId: user._id,
      req
    });
  }

  static async logBookingCreated(booking, userId, req = null) {
    return this.log({
      businessId: booking.businessId,
      userId,
      action: 'BOOKING_CREATED',
      resourceType: 'APPOINTMENT',
      resourceId: booking._id,
      details: { customerId: booking.customerId },
      req
    });
  }

  static async logOrderCreated(order, userId, req = null) {
    return this.log({
      businessId: order.businessId,
      userId,
      action: 'ORDER_CREATED',
      resourceType: 'ORDER',
      resourceId: order._id,
      details: { amount: order.amount, customerId: order.customerId },
      req
    });
  }
}

export default AuditService;
