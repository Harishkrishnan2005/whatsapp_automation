import Conversation from '../models/Conversation.js';
import Customer from '../models/Customer.js';
import logger from './logger.js';

class ConversationTracker {
  async addMessage(businessId, phone, sender, text, options = {}) {
    try {
      const normalizedPhone = String(phone || '').trim();
      const normalizedText = String(text || '').trim();
      if (!normalizedPhone || !businessId) return;
      if (!normalizedText) return;

      const fallbackCustomer = options.customerId
        ? null
        : await Customer.findOne({ phone: normalizedPhone, businessId }).select('_id assignedTo').lean();

      const resolvedCustomerId = options.customerId || fallbackCustomer?._id || null;
      const resolvedAssignedStaffId =
        options.assignedStaffId !== undefined
          ? options.assignedStaffId
          : (fallbackCustomer?.assignedTo || null);

      const message = {
        sender: String(sender || 'customer').trim(),
        text: normalizedText,
        timestamp: new Date()
      };

      // Upsert conversation and push message
      await Conversation.findOneAndUpdate(
        { phone: normalizedPhone, businessId },
        { 
          $setOnInsert: {
            phone: normalizedPhone,
            businessId,
          },
          $set: {
            customerId: resolvedCustomerId,
            assignedStaffId: resolvedAssignedStaffId,
            lastMessage: normalizedText,
            lastMessageAt: message.timestamp,
            updatedAt: new Date(),
            status: 'active',
          },
          $push: { messages: message },
        },
        { upsert: true, new: true }
      );
    } catch (error) {
      logger.error('[ConversationTracker] Error adding message:', error);
    }
  }
}

export default new ConversationTracker();
