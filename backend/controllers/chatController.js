import ChatService from '../services/chatService.js';

class ChatController {
  // Get all chats (customers) with last message
  async getAllChats(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const scopeBusinessId = req.user?.role === 'admin' ? undefined : req.user.businessId;
      const result = await ChatService.getAllChats(scopeBusinessId, parseInt(page), parseInt(limit));
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Get customer details with stats
  async getCustomerDetails(req, res) {
    try {
      const { customerId } = req.params;
      const scopeBusinessId = req.user?.role === 'admin' ? undefined : req.user.businessId;
      const customer = await ChatService.getCustomerDetails(scopeBusinessId, customerId);
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
      const scopeBusinessId = req.user?.role === 'admin' ? undefined : req.user.businessId;
      const result = await ChatService.getMessages(scopeBusinessId, customerId, parseInt(page), parseInt(limit));
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Send message from admin/staff
  async sendMessage(req, res) {
    try {
      const { customerId, message } = req.body;
      const scopeBusinessId = req.user?.role === 'admin' ? undefined : req.user.businessId;

      if (!customerId || !message) {
        return res.status(400).json({ message: 'customerId and message are required' });
      }

      const newMessage = await ChatService.sendMessage(scopeBusinessId, customerId, message, 'staff');
      res.status(201).json(newMessage);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Mark messages as read
  async markMessagesAsRead(req, res) {
    try {
      const { customerId } = req.params;
      const scopeBusinessId = req.user?.role === 'admin' ? undefined : req.user.businessId;
      await ChatService.markMessagesAsRead(scopeBusinessId, customerId);
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

      const scopeBusinessId = req.user?.role === 'admin' ? undefined : req.user.businessId;
      const results = await ChatService.searchCustomers(scopeBusinessId, q);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new ChatController();
