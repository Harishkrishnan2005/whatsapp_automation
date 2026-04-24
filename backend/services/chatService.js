import Customer from '../models/Customer.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import buildTenantScope from '../utils/tenantScope.js';
import socketManager from '../utils/socketManager.js';

class ChatService {
  async assertCustomerAccess(businessId, customerId, user = null) {
    const tenantScope = buildTenantScope(businessId);
    const customer = await Customer.findOne({ _id: customerId, ...tenantScope }).lean();
    if (!customer) {
      throw new Error('Customer not found');
    }

    const userId = user?.id || user?._id;
    if (user?.role === 'staff' && String(customer.assignedTo || '') !== String(userId || '')) {
      throw new Error('Unauthorized to access this conversation');
    }

    return customer;
  }

  async getOrCreateConversation(businessId, customerId, phone) {
    const tenantId = businessId;
    let conversation = await Conversation.findOne({ phone, tenantId });
    if (!conversation) {
      conversation = await Conversation.create({
        phone,
        customerId,
        businessId,
        tenantId,
        status: 'active'
      });
    }
    return conversation;
  }

  // Get all customers with last message, sorted by latest activity
  async getAllChats(businessId, page = 1, limit = 20, user = null) {
    try {
      const skip = (page - 1) * limit;
      const tenantScope = buildTenantScope(businessId);
      
      const query = { ...tenantScope };
      const userId = user?.id || user?._id;
      if (user?.role === 'staff') {
        query.assignedTo = userId;
      }

      const customers = await Customer.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      // Get last message for each customer
      const chatsWithMessages = await Promise.all(
        customers.map(async (customer) => {
          const lastMessage = await Message.findOne({ customerId: customer._id, ...tenantScope })
            .sort({ createdAt: -1 })
            .lean();

          const unreadCount = await Message.countDocuments({
            customerId: customer._id,
            ...tenantScope,
            type: 'incoming',
            status: { $ne: 'read' },
          });

          return {
            ...customer,
            lastMessage: lastMessage?.content || lastMessage?.message || 'No messages yet',
            lastMessageTime: lastMessage?.createdAt || customer.createdAt,
            messageType: lastMessage?.type || null,
            unreadCount,
          };
        })
      );

      const total = await Customer.countDocuments(query);

      return {
        chats: chatsWithMessages,
        total,
        page,
        limit,
      };
    } catch (error) {
      throw new Error(`Failed to fetch chats: ${error.message}`);
    }
  }

  // Get all messages for a customer with pagination
  async getMessages(businessId, customerId, page = 1, limit = 50, user = null) {
    try {
      const skip = (page - 1) * limit;
      const tenantScope = buildTenantScope(businessId);
      await this.assertCustomerAccess(businessId, customerId, user);

      const messages = await Message.find({ customerId, ...tenantScope })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      const orderedMessages = messages.reverse();

      const total = await Message.countDocuments({ customerId, ...tenantScope });

      return {
        messages: orderedMessages,
        total,
        page,
        limit,
      };
    } catch (error) {
      throw new Error(`Failed to fetch messages: ${error.message}`);
    }
  }

  // Send message from admin/staff
  async sendMessage(businessId, customerId, content, senderType = 'staff', user = null) {
    try {
      const tenantScope = buildTenantScope(businessId);
      const customer = await this.assertCustomerAccess(businessId, customerId, user);
      const conversation = await this.getOrCreateConversation(businessId, customerId, customer.phone);

      const senderId = user?.id || user?._id;
      if (!senderId) throw new Error('Sender context missing');

      // Create and save message
      const newMessage = await Message.create({
        customerId,
        businessId,
        tenantId: businessId,
        content,
        message: content, // Backward compatibility
        type: 'outgoing',
        senderType,
        sender: senderId,
        senderModel: 'User',
        receiver: customerId,
        receiverModel: 'Customer',
        conversationId: conversation._id,
        status: 'sent'
      });

      // Update customer and conversation last activity
      await Customer.findOneAndUpdate({ _id: customerId, ...tenantScope }, { updatedAt: new Date() });
      await Conversation.findByIdAndUpdate(conversation._id, {
        lastMessage: content,
        lastMessageAt: new Date(),
        $push: {
          messages: {
            senderId,
            senderModel: 'User',
            content,
            status: 'sent'
          }
        }
      });

      // Real-time notification
      socketManager.emitToRoom(String(conversation._id), 'receive_message', newMessage);
      socketManager.emitToUser(String(businessId), 'chat_list_update', { customerId, lastMessage: content });

      return newMessage;
    } catch (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  // Receive incoming message (webhook)
  async receiveMessage(phone, content, businessId) {
    try {
      // Find or create customer
      let customer = await Customer.findOne({ phone, businessId });
      if (!customer) {
        customer = await Customer.create({
          phone,
          name: 'Guest',
          status: 'new',
          chatState: 'ASK_NAME',
          businessId,
          tenantId: businessId
        });
      }

      const conversation = await this.getOrCreateConversation(businessId, customer._id, phone);

      // Save incoming message
      const incomingMessage = await Message.create({
        customerId: customer._id,
        businessId,
        tenantId: businessId,
        content,
        message: content, // Backward compatibility
        type: 'incoming',
        senderType: 'customer',
        sender: customer._id,
        senderModel: 'Customer',
        receiver: businessId, // Business/Tenant as receiver
        receiverModel: 'Business',
        conversationId: conversation._id,
        status: 'delivered'
      });

      // Update customer and conversation
      customer.updatedAt = new Date();
      await customer.save();

      await Conversation.findByIdAndUpdate(conversation._id, {
        lastMessage: content,
        lastMessageAt: new Date(),
        $push: {
          messages: {
            senderId: customer._id,
            senderModel: 'Customer',
            content,
            status: 'delivered'
          }
        }
      });

      // Real-time notifications
      socketManager.emitToRoom(String(conversation._id), 'receive_message', incomingMessage);
      socketManager.emitToUser(String(businessId), 'chat_list_update', { customerId: customer._id, lastMessage: content });

      return { customer, incomingMessage };
    } catch (error) {
      throw new Error(`Failed to receive message: ${error.message}`);
    }
  }

  // Search customers by name or phone
  async searchCustomers(businessId, query, user = null) {
    try {
      const tenantScope = buildTenantScope(businessId);
      const customerQuery = {
        ...tenantScope,
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { phone: { $regex: query, $options: 'i' } },
        ],
      };

      const userId = user?.id || user?._id;
      if (user?.role === 'staff') {
        customerQuery.assignedTo = userId;
      }

      const customers = await Customer.find(customerQuery)
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean();

      // Get last message for each customer
      const chatsWithMessages = await Promise.all(
        customers.map(async (customer) => {
          const lastMessage = await Message.findOne({ customerId: customer._id, ...tenantScope })
            .sort({ createdAt: -1 })
            .lean();

          return {
            ...customer,
            lastMessage: lastMessage?.content || lastMessage?.message || 'No messages yet',
            lastMessageTime: lastMessage?.createdAt || customer.createdAt,
          };
        })
      );

      return chatsWithMessages;
    } catch (error) {
      throw new Error(`Failed to search customers: ${error.message}`);
    }
  }

  // Get customer details with stats
  async getCustomerDetails(businessId, customerId, user = null) {
    try {
      const customer = await this.assertCustomerAccess(businessId, customerId, user);

      const messageScope = buildTenantScope(customer.businessId || businessId);
      const messageCount = await Message.countDocuments({ customerId, ...messageScope });
      const lastMessage = await Message.findOne({ customerId, ...messageScope })
        .sort({ createdAt: -1 })
        .lean();

      return {
        ...customer,
        totalMessages: messageCount,
        lastMessage: lastMessage?.content || lastMessage?.message || null,
        lastMessageTime: lastMessage?.createdAt || null,
      };
    } catch (error) {
      throw new Error(`Failed to fetch customer details: ${error.message}`);
    }
  }

  // Mark messages as read
  async markMessagesAsRead(businessId, customerId, user = null) {
    try {
      const tenantScope = buildTenantScope(businessId);
      await this.assertCustomerAccess(businessId, customerId, user);
      await Message.updateMany(
        { customerId, ...tenantScope, type: 'incoming', status: { $ne: 'read' } },
        { status: 'read', isRead: true }
      );
      
      const conversation = await Conversation.findOne({ customerId, tenantId: businessId });
      if (conversation) {
        await Conversation.updateOne(
          { _id: conversation._id, 'messages.status': { $ne: 'read' } },
          { $set: { 'messages.$[].status': 'read' } }
        );
        socketManager.emitToRoom(String(conversation._id), 'messages_read', { customerId });
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to mark messages as read: ${error.message}`);
    }
  }
}

export default new ChatService();
