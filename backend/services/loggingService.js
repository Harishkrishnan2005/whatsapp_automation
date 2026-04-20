import AuditLog from '../models/AuditLog.js';

class LoggingService {
  async log(data) {
    try {
      const { businessId, userId, action, resourceType, resourceId, details, req } = data;
      
      const logEntry = {
        businessId,
        userId,
        action,
        resourceType,
        resourceId,
        details,
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent']
      };

      await AuditLog.create(logEntry);
    } catch (error) {
      console.error('[LoggingService] Failed to record audit log:', error);
    }
  }

  // Specifically for chatbot actions where req isn't available
  async logSystem(data) {
    try {
      await AuditLog.create({
        ...data,
        ipAddress: '0.0.0.0',
        userAgent: 'SYSTEM/CHATBOT'
      });
    } catch (error) {
      console.error('[LoggingService] Failed to record system log:', error);
    }
  }
}

export default new LoggingService();
