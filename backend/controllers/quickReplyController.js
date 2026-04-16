import QuickReplyService from '../services/quickReplyService.js';

class QuickReplyController {
  async createQuickReply(req, res) {
    try {
      const { title, message } = req.body;
      const createdBy = req.user.id;
      const reply = await QuickReplyService.createQuickReply(req.businessId, title, message, createdBy);
      res.status(201).json(reply);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getQuickReplies(req, res) {
    try {
      const replies = await QuickReplyService.getQuickReplies(req.businessId);
      res.json(replies);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updateQuickReply(req, res) {
    try {
      const { id } = req.params;
      const reply = await QuickReplyService.updateQuickReply(req.businessId, id, req.body);
      res.json(reply);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async deleteQuickReply(req, res) {
    try {
      const { id } = req.params;
      await QuickReplyService.deleteQuickReply(req.businessId, id);
      res.json({ message: 'Quick reply deleted' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new QuickReplyController();
