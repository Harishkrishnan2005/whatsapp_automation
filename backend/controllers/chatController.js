import ChatService from '../services/chatService.js';

class ChatController {
  // Get all chats (customers) with last message
  async getAllChats(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await ChatService.getAllChats(req.businessId, parseInt(page), parseInt(limit));
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Get customer details with stats
  async getCustomerDetails(req, res) {
    try {
      const { customerId } = req.params;
      const customer = await ChatService.getCustomerDetails(req.businessId, customerId);
      res.json(customer);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

  // Get all messages for a customer
  async getMessages(req, res) {
    try {
      const { customerId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const result = await ChatService.getMessages(req.businessId, customerId, parseInt(page), parseInt(limit));
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Send message from admin/staff
  async sendMessage(req, res) {
    try {
      const { customerId, message } = req.body;

      if (!customerId || !message) {
        return res.status(400).json({ message: 'customerId and message are required' });
      }

      const newMessage = await ChatService.sendMessage(req.businessId, customerId, message, 'staff');
      res.status(201).json(newMessage);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Mark messages as read
  async markMessagesAsRead(req, res) {
    try {
      const { customerId } = req.params;
      await ChatService.markMessagesAsRead(req.businessId, customerId);
      res.json({ message: 'Messages marked as read' });
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

      const results = await ChatService.searchCustomers(req.businessId, q);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new ChatController();
