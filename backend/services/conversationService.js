import Conversation from '../models/Conversation.js';
import Customer from '../models/Customer.js';
import Message from '../models/Message.js';
import ChatAssignment from '../models/ChatAssignment.js';
import buildTenantScope from '../utils/tenantScope.js';
import socketManager from '../utils/socketManager.js';

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

  async sendMessage(conversationId, content, user, businessId) {
    const normalizedContent = String(content || '').trim();
    if (!normalizedContent) {
      throw new Error('Message content is required');
    }

    const conversation = await this.getConversationById(conversationId, user, businessId);
    const customerId = conversation.customerId?._id || conversation.customerId;
    if (!customerId) {
      throw new Error('Conversation is not linked to a customer');
    }

    const senderId = user?.id || user?._id;
    const messageTimestamp = new Date();

    // 1. Save in Messages collection (for legacy/history compatibility)
    await Message.create({
      customerId,
      businessId,
      tenantId: businessId,
      content: normalizedContent,
      message: normalizedContent,
      type: 'outgoing',
      senderType: user.role,
      sender: senderId,
      senderModel: 'User',
      receiver: customerId,
      receiverModel: 'Customer',
      conversationId: conversation._id,
      status: 'sent'
    });

    // 2. Update Conversation with nested message
    const updatedConversation = await Conversation.findOneAndUpdate(
      { _id: conversationId },
      {
        $push: {
          messages: {
            senderId,
            senderModel: 'User',
            content: normalizedContent,
            timestamp: messageTimestamp,
            status: 'sent'
          }
        },
        $set: {
          lastMessage: normalizedContent,
          lastMessageAt: messageTimestamp,
          updatedAt: messageTimestamp,
          status: 'active',
        }
      },
      { new: true }
    )
      .populate('customerId', 'name phone assignedTo')
      .populate('assignedStaffId', 'name email');

    // 3. Real-time broadcast
    socketManager.emitToRoom(String(conversationId), 'receive_message', {
      senderId,
      senderModel: 'User',
      content: normalizedContent,
      timestamp: messageTimestamp,
      status: 'sent',
      conversationId
    });

    socketManager.emitToUser(String(businessId), 'chat_list_update', {
      conversationId,
      lastMessage: normalizedContent,
      updatedAt: messageTimestamp
    });

    return updatedConversation;
  }

  async markAsRead(conversationId, user, businessId) {
    const filter = this.buildAccessFilter(user, businessId, { _id: conversationId });
    
    await Conversation.updateOne(
      { ...filter, 'messages.status': { $ne: 'read' } },
      { $set: { 'messages.$[].status': 'read' } }
    );

    socketManager.emitToRoom(String(conversationId), 'messages_read', { conversationId });
    return true;
  }

  async closeConversation(conversationId, user, businessId) {
    const filter = this.buildAccessFilter(user, businessId, { _id: conversationId });
    const conversation = await Conversation.findOne(filter).select('customerId');

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    const updatedConversation = await Conversation.findOneAndUpdate(
      filter,
      { $set: { status: 'closed', updatedAt: new Date() } },
      { new: true }
    );

    if (conversation.customerId) {
      await ChatAssignment.updateMany(
        { customerId: conversation.customerId, ...buildTenantScope(businessId), status: { $ne: 'closed' } },
        { $set: { status: 'closed' } }
      );
    }

    socketManager.emitToUser(String(businessId), 'conversation_closed', { conversationId });
    return updatedConversation;
  }
}

export default new ConversationService();
