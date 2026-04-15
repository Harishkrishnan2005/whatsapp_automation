import ChatAssignmentService from '../services/chatAssignmentService.js';

class ChatAssignmentController {
  async assignChat(req, res) {
    try {
      const { customerId, staffId } = req.body;
      const assignment = await ChatAssignmentService.assignChat(customerId, staffId, req.user.businessId);
      res.status(201).json(assignment);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getAssignedChats(req, res) {
    try {
      const staffId = req.params.staffId || req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const scopeBusinessId = req.user?.role === 'admin' ? undefined : req.user.businessId;
      const result = await ChatAssignmentService.getAssignedChats(staffId, page, limit, scopeBusinessId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getAllActiveChats(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const scopeBusinessId = req.user?.role === 'admin' ? undefined : req.user.businessId;
      const result = await ChatAssignmentService.getAllActiveChats(page, limit, scopeBusinessId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async transferChat(req, res) {
    try {
      const { id } = req.params;
      const { newStaffId } = req.body;
      const scopeBusinessId = req.user?.role === 'admin' ? undefined : req.user.businessId;
      const assignment = await ChatAssignmentService.transferChat(id, newStaffId, scopeBusinessId);
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async closeChat(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const scopeBusinessId = req.user?.role === 'admin' ? undefined : req.user.businessId;
      const assignment = await ChatAssignmentService.closeChat(id, notes, scopeBusinessId);
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async takeOverChat(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;
      const scopeBusinessId = req.user?.role === 'admin' ? undefined : req.user.businessId;
      const assignment = await ChatAssignmentService.takeOverChat(id, adminId, scopeBusinessId);
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getChatHistory(req, res) {
    try {
      const { customerId } = req.params;
      const scopeBusinessId = req.user?.role === 'admin' ? undefined : req.user.businessId;
      const history = await ChatAssignmentService.getChatHistory(customerId, scopeBusinessId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new ChatAssignmentController();
