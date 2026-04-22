import ChatService from '../services/chatService.js';
import conversationTracker from '../utils/conversationTracker.js';
import Customer from '../models/Customer.js';
import buildTenantScope from '../utils/tenantScope.js';

class ChatController {
  // Get all chats (customers) with last message
  async getAllChats(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await ChatService.getAllChats(req.businessId, parseInt(page), parseInt(limit), req.user);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Get customer details with stats
  async getCustomerDetails(req, res) {
    try {
      const { customerId } = req.params;
      const customer = await ChatService.getCustomerDetails(req.businessId, customerId, req.user);
      res.json(customer);
    } catch (error) {
      const status = error.message.includes('Unauthorized') ? 403 : 404;
      res.status(status).json({ message: error.message });
    }
  }

  // Get all messages for a customer
  async getMessages(req, res) {
    try {
      const { customerId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const result = await ChatService.getMessages(req.businessId, customerId, parseInt(page), parseInt(limit), req.user);
      res.json(result);
    } catch (error) {
      const status = error.message.includes('Unauthorized') ? 403 : 500;
      res.status(status).json({ message: error.message });
    }
  }

  // Send message from admin/staff
  async sendMessage(req, res) {
    try {
      const { customerId, message } = req.body;

      if (!customerId || !message) {
        return res.status(400).json({ message: 'customerId and message are required' });
      }

      const senderType = req.user?.role === 'admin' ? 'admin' : 'staff';
      const newMessage = await ChatService.sendMessage(req.businessId, customerId, message, senderType, req.user);
      
      // Unified Conversation Persistence
      const customer = await Customer.findOne({ _id: customerId, ...buildTenantScope(req.businessId) });
      if (customer) {
        await conversationTracker.addMessage(req.businessId, customer.phone, senderType, message, {
          customerId: customer._id,
          assignedStaffId: customer.assignedTo || null,
        });
      }

      res.status(201).json(newMessage);
    } catch (error) {
      const status = error.message.includes('Unauthorized') ? 403 : 500;
      res.status(status).json({ message: error.message });
    }
  }

  // Mark messages as read
  async markMessagesAsRead(req, res) {
    try {
      const { customerId } = req.params;
      await ChatService.markMessagesAsRead(req.businessId, customerId, req.user);
      res.json({ message: 'Messages marked as read' });
    } catch (error) {
      const status = error.message.includes('Unauthorized') ? 403 : 500;
      res.status(status).json({ message: error.message });
    }
  }

  // Get all chats for simulation (Returns array directly)
  async getAllChatsForSimulation(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const result = await ChatService.getAllChats(req.businessId, parseInt(page), parseInt(limit), req.user);
      res.json(result.chats);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Get messages for simulation (Returns array directly as requested)
  async getMessagesForSimulation(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 100 } = req.query;
      const result = await ChatService.getMessages(req.businessId, id, parseInt(page), parseInt(limit), req.user);
      res.json(result.messages);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Send message for simulation (Uses chatId as specified)
  async sendMessageForSimulation(req, res) {
    try {
      const { chatId, phone, message } = req.body;
      if ((!chatId && !phone) || !message) {
        return res.status(400).json({ message: 'chatId or phone, and message are required' });
      }

      let customer = null;
      if (chatId) {
        customer = await Customer.findOne({ _id: chatId, businessId: req.businessId });
      }
      if (!customer && phone) {
        customer = await Customer.findOne({ phone: String(phone).trim(), businessId: req.businessId });
      }
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found for this conversation' });
      }

      const newMessage = await ChatService.sendMessage(req.businessId, customer._id, message, 'admin', req.user);
      
      // Unified Conversation Persistence
      await conversationTracker.addMessage(req.businessId, customer.phone, 'admin', message, {
        customerId: customer._id,
        assignedStaffId: customer.assignedTo || null,
      });

      res.status(201).json(newMessage);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Search customers
  async searchCustomers(req, res) {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ message: 'Search query is required' });
      }

      const results = await ChatService.searchCustomers(req.businessId, q, req.user);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new ChatController();
