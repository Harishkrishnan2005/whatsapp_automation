import Customer from '../models/Customer.js';
import Message from '../models/Message.js';
import buildTenantScope from '../utils/tenantScope.js';

class ChatService {
  // Get all customers with last message, sorted by latest activity
  async getAllChats(businessId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const tenantScope = buildTenantScope(businessId);
      
      const customers = await Customer.find(tenantScope)
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
            isRead: false,
          });

          return {
            ...customer,
            lastMessage: lastMessage?.message || 'No messages yet',
            lastMessageTime: lastMessage?.createdAt || customer.createdAt,
            messageType: lastMessage?.type || null,
            unreadCount,
          };
        })
      );

      const total = await Customer.countDocuments(tenantScope);

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
  async getMessages(businessId, customerId, page = 1, limit = 50) {
    try {
      const skip = (page - 1) * limit;
      const tenantScope = buildTenantScope(businessId);

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
  async sendMessage(businessId, customerId, message, senderType = 'staff') {
    try {
      const tenantScope = buildTenantScope(businessId);
      // Verify customer exists
      const customer = await Customer.findOne({ _id: customerId, ...tenantScope });
      if (!customer) {
        throw new Error('Customer not found');
      }

      const resolvedBusinessId = customer.businessId;

      // Create and save message
      const newMessage = await Message.create({
        customerId,
        businessId: resolvedBusinessId,
        message,
        type: 'outgoing',
        senderType,
      });

      // Update customer's last activity
      await Customer.findOneAndUpdate({ _id: customerId }, { updatedAt: new Date() });

      return newMessage;
    } catch (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  // Receive incoming message (webhook)
  async receiveMessage(phone, message, businessId) {
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
        });
      }

      // Save incoming message
      const incomingMessage = await Message.create({
        customerId: customer._id,
        businessId,
        message,
        type: 'incoming',
      });

      // Update customer's updatedAt to sort by latest activity
      customer.updatedAt = new Date();
      await customer.save();

      return {
        customer,
        incomingMessage,
      };
    } catch (error) {
      throw new Error(`Failed to receive message: ${error.message}`);
    }
  }

  // Search customers by name or phone
  async searchCustomers(businessId, query) {
    try {
      const tenantScope = buildTenantScope(businessId);
      const customers = await Customer.find({
        ...tenantScope,
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { phone: { $regex: query, $options: 'i' } },
        ],
      })
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
            lastMessage: lastMessage?.message || 'No messages yet',
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
  async getCustomerDetails(businessId, customerId) {
    try {
      const tenantScope = buildTenantScope(businessId);
      const customer = await Customer.findOne({ _id: customerId, ...tenantScope }).lean();
      if (!customer) {
        throw new Error('Customer not found');
      }

      const messageScope = buildTenantScope(customer.businessId || businessId);
      const messageCount = await Message.countDocuments({ customerId, ...messageScope });
      const lastMessage = await Message.findOne({ customerId, ...messageScope })
        .sort({ createdAt: -1 })
        .lean();

      return {
        ...customer,
        totalMessages: messageCount,
        lastMessage: lastMessage?.message || null,
        lastMessageTime: lastMessage?.createdAt || null,
      };
    } catch (error) {
      throw new Error(`Failed to fetch customer details: ${error.message}`);
    }
  }

  // Mark messages as read
  async markMessagesAsRead(businessId, customerId) {
    try {
      const tenantScope = buildTenantScope(businessId);
      await Message.updateMany(
        { customerId, ...tenantScope, type: 'incoming', isRead: false },
        { isRead: true }
      );
      return true;
    } catch (error) {
      throw new Error(`Failed to mark messages as read: ${error.message}`);
    }
  }
}

export default new ChatService();
