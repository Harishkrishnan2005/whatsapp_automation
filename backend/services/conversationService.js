import Conversation from '../models/Conversation.js';
import Customer from '../models/Customer.js';
import Message from '../models/Message.js';
import ChatAssignment from '../models/ChatAssignment.js';
import buildTenantScope from '../utils/tenantScope.js';

class ConversationService {
  buildAccessFilter(user, businessId, extra = {}) {
    const filter = { ...buildTenantScope(businessId), ...extra };
    const userId = user?.id || user?._id;

    if (user?.role === 'staff') {
      filter.assignedStaffId = userId;
    }

    return filter;
  }

  async listConversations(user, businessId, page = 1, limit = 20, search = '') {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;
    const query = this.buildAccessFilter(user, businessId, { status: { $ne: 'closed' } });

    const conversations = await Conversation.find(query)
      .populate('customerId', 'name phone assignedTo')
      .populate('assignedStaffId', 'name email')
      .sort({ updatedAt: -1 })
      .lean();

    const filtered = search
      ? conversations.filter((conversation) => {
          const q = String(search || '').trim().toLowerCase();
          const customerName = String(conversation?.customerId?.name || '').toLowerCase();
          const phone = String(conversation?.phone || conversation?.customerId?.phone || '').toLowerCase();
          const lastMessage = String(conversation?.lastMessage || '').toLowerCase();
          return customerName.includes(q) || phone.includes(q) || lastMessage.includes(q);
        })
      : conversations;

    return {
      conversations: filtered.slice(skip, skip + safeLimit),
      total: filtered.length,
      page: safePage,
      limit: safeLimit,
    };
  }

  async getConversationById(conversationId, user, businessId) {
    const conversation = await Conversation.findOne(
      this.buildAccessFilter(user, businessId, { _id: conversationId })
    )
      .populate('customerId', 'name phone assignedTo')
      .populate('assignedStaffId', 'name email');

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    return conversation;
  }

  async sendMessage(conversationId, text, user, businessId) {
    const normalizedText = String(text || '').trim();
    if (!normalizedText) {
      throw new Error('Message text is required');
    }

    const conversation = await this.getConversationById(conversationId, user, businessId);
    const customerId = conversation.customerId?._id || conversation.customerId;
    if (!customerId) {
      throw new Error('Conversation is not linked to a customer');
    }

    const senderRole = user?.role === 'admin' ? 'admin' : 'staff';
    const messageTimestamp = new Date();

    await Message.create({
      customerId,
      businessId,
      message: normalizedText,
      type: 'outgoing',
      senderType: senderRole,
    });

    await Customer.findOneAndUpdate(
      { _id: customerId, ...buildTenantScope(businessId) },
      { updatedAt: messageTimestamp }
    );

    const updatedConversation = await Conversation.findOneAndUpdate(
      this.buildAccessFilter(user, businessId, { _id: conversationId }),
      {
        $push: {
          messages: {
            sender: senderRole,
            text: normalizedText,
            timestamp: messageTimestamp,
          }
        },
        $set: {
          lastMessage: normalizedText,
          lastMessageAt: messageTimestamp,
          updatedAt: messageTimestamp,
          status: 'active',
        }
      },
      { new: true }
    )
      .populate('customerId', 'name phone assignedTo')
      .populate('assignedStaffId', 'name email');

    return updatedConversation;
  }

  async closeConversation(conversationId, user, businessId) {
    const conversation = await Conversation.findOne(
      this.buildAccessFilter(user, businessId, { _id: conversationId })
    ).select('customerId');

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    const updatedConversation = await Conversation.findOneAndUpdate(
      this.buildAccessFilter(user, businessId, { _id: conversationId }),
      {
        $set: {
          status: 'closed',
          updatedAt: new Date(),
        }
      },
      { new: true }
    )
      .populate('customerId', 'name phone assignedTo')
      .populate('assignedStaffId', 'name email');

    if (conversation.customerId) {
      await ChatAssignment.updateMany(
        {
          customerId: conversation.customerId,
          ...buildTenantScope(businessId),
          status: { $ne: 'closed' },
        },
        {
          $set: {
            status: 'closed',
          }
        }
      );
    }

    return updatedConversation;
  }
}

export default new ConversationService();
