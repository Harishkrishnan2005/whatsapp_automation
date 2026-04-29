import ChatbotController from '../chatbotController.js';
import ChatbotFlow from '../../models/ChatbotFlow.js';

const AdminChatbotController = {
  listFlows(req, res) {
    return ChatbotController.getFlows(req, res);
  },
  createFlow(req, res) {
    return ChatbotController.createFlow(req, res);
  },
  getFlow(req, res) {
    return ChatbotController.getFlows(req, res);
  },
  updateFlow(req, res) {
    return ChatbotController.updateFlow(req, res);
  },
  deleteFlow(req, res) {
    return ChatbotController.deleteFlow(req, res);
  },
  async getFlowSteps(req, res) {
    try {
      const flow = await ChatbotFlow.findOne({ _id: req.params.id, businessId: req.businessId });
      if (!flow) return res.status(404).json({ message: 'Flow not found' });
      res.json(flow.steps || [flow]);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

export default AdminChatbotController;
