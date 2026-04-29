import Conversation from '../models/Conversation.js';
import Customer from '../models/Customer.js';
import logger from './logger.js';

class ConversationTracker {
  async addMessage(businessId, phone, sender, text, options = {}) {
    try {
      const normalizedPhone = String(phone || '').trim();
      const normalizedText = String(text || '').trim();
      const resolvedBusinessId = businessId?._id || businessId;
      if (!normalizedPhone || !businessId) return;
      if (!normalizedText) return;

      const fallbackCustomer = options.customerId
        ? null
        : await Customer.findOne({ phone: normalizedPhone, businessId: resolvedBusinessId }).select('_id assignedTo').lean();

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

      const conversationLookup = {
        phone: normalizedPhone,
        $or: [
          { tenantId: resolvedBusinessId },
          { businessId: resolvedBusinessId },
        ],
      };

      let conversation = await Conversation.findOne(conversationLookup).lean();

      if (!conversation) {
        try {
          conversation = await Conversation.create({
            phone: normalizedPhone,
            businessId: resolvedBusinessId,
            tenantId: resolvedBusinessId,
            customerId: resolvedCustomerId,
            assignedStaffId: resolvedAssignedStaffId,
            lastMessage: normalizedText,
            lastMessageAt: message.timestamp,
            status: 'active',
            messages: [message],
          });
          return;
        } catch (error) {
          if (error?.code !== 11000) {
            throw error;
          }

          conversation = await Conversation.findOne(conversationLookup).lean();
        }
      }

      if (!conversation) {
        return;
      }

      const setUpdates = {
        customerId: resolvedCustomerId,
        assignedStaffId: resolvedAssignedStaffId,
        lastMessage: normalizedText,
        lastMessageAt: message.timestamp,
        updatedAt: new Date(),
        status: 'active',
      };

      if (!conversation.tenantId) {
        setUpdates.tenantId = resolvedBusinessId;
      }

      if (!conversation.businessId) {
        setUpdates.businessId = resolvedBusinessId;
      }

      await Conversation.findByIdAndUpdate(
        conversation._id,
        {
          $set: setUpdates,
          $push: { messages: message },
        },
        { new: true }
      );
    } catch (error) {
      logger.error('[ConversationTracker] Error adding message:', error);
    }
  }
}

export default new ConversationTracker();
