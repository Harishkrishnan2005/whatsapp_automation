import Customer from '../models/Customer.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import buildTenantScope from '../utils/tenantScope.js';
import socketManager from '../utils/socketManager.js';
import customerService from './customerService.js';

class ChatService {
  async ensureCustomer(phone, businessId, seedData = {}) {
    return customerService.getOrCreateCustomerByPhone(phone, businessId, seedData);
  }

  async saveCustomerTurn({
    businessId,
    customer,
    phone,
    content,
    products = [],
    type = 'incoming',
    senderType = 'customer',
    messageType = 'TEXT',
    templateName = null,
    templateVariables = null,
  }) {
    const conversation = await this.getOrCreateConversation(businessId, customer._id, phone || customer.phone);
    const isIncoming = type === 'incoming';

    const message = await Message.create({
      customerId: customer._id,
      businessId,
      tenantId: businessId,
      content,
      message: content,
      type,
      senderType,
      sender: isIncoming ? customer._id : businessId,
      senderModel: isIncoming ? 'Customer' : 'Business',
      receiver: isIncoming ? businessId : customer._id,
      receiverModel: isIncoming ? 'Business' : 'Customer',
      conversationId: conversation._id,
      status: isIncoming ? 'delivered' : 'sent',
      products,
      messageType,
      templateName,
      templateVariables,
    });

    await customerService.touchCustomer(customer);

    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: content,
      lastMessageAt: new Date(),
      status: 'active',
          $push: {
            messages: {
              sender: isIncoming ? 'customer' : senderType === 'chatbot' ? 'bot' : senderType,
              text: content,
              timestamp: new Date(),
              messageType,
              templateName,
            },
          },
    });

    return { message, conversation };
  }

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
    const normalizedPhone = String(phone || '').trim();
    const businessObjectId = businessId?._id || businessId;

    const baseLookup = {
      phone: normalizedPhone,
      $or: [
        { tenantId },
        { businessId: businessObjectId },
      ],
    };

    let conversation = await Conversation.findOne(baseLookup);
    if (conversation) {
      const updates = {};

      if (!conversation.tenantId) {
        updates.tenantId = tenantId;
      }

      if (!conversation.businessId) {
        updates.businessId = businessObjectId;
      }

      if (!conversation.customerId && customerId) {
        updates.customerId = customerId;
      }

      if (Object.keys(updates).length > 0) {
        conversation = await Conversation.findByIdAndUpdate(
          conversation._id,
          { $set: updates },
          { new: true }
        );
      }

      return conversation;
    }

    try {
      return await Conversation.create({
        phone: normalizedPhone,
        customerId,
        businessId: businessObjectId,
        tenantId,
        status: 'active'
      });
    } catch (error) {
      // Handle duplicate-key races and legacy unique indexes by reloading the existing record.
      if (error?.code === 11000) {
        const existingConversation = await Conversation.findOne(baseLookup);
        if (existingConversation) {
          return existingConversation;
        }
      }

      throw error;
    }
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
      await Customer.findOneAndUpdate(
        { _id: customerId, ...tenantScope },
        {
          updatedAt: new Date(),
          lastInteraction: new Date(),
          lastActivity: new Date(),
        }
      );
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
      const customer = await this.ensureCustomer(phone, businessId, {
        name: 'Guest',
        status: 'new',
        chatState: 'ASK_NAME',
      });

      const { message: incomingMessage, conversation } = await this.saveCustomerTurn({
        businessId,
        customer,
        phone,
        content,
        type: 'incoming',
        senderType: 'customer',
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
