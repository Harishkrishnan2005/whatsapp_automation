import ChatbotFlow from '../models/ChatbotFlow.js';
import seedChatbotFlows from '../utils/seedChatbotFlows.js';

class ChatbotController {
  async createFlow(req, res) {
    try {
      const flow = await ChatbotFlow.create({ ...req.body, businessId: req.user.businessId });
      res.status(201).json(flow);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getFlows(req, res) {
    try {
      const businessId = req.user.businessId;
      let flows = await ChatbotFlow.find({ businessId }).sort({ createdAt: -1 });

      // Auto-bootstrap flows for this tenant so chatbot responses are editable in Chatbot page
      if (!flows.length) {
        await seedChatbotFlows(businessId);
        flows = await ChatbotFlow.find({ businessId }).sort({ createdAt: -1 });
      }

      res.json(flows);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updateFlow(req, res) {
    try {
      const flow = await ChatbotFlow.findOneAndUpdate({ _id: req.params.id, businessId: req.user.businessId }, req.body, { new: true });
      if (!flow) return res.status(404).json({ message: 'Flow not found' });
      res.json(flow);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async deleteFlow(req, res) {
    try {
      const flow = await ChatbotFlow.findOneAndDelete({ _id: req.params.id, businessId: req.user.businessId });
      if (!flow) return res.status(404).json({ message: 'Flow not found' });
      res.json({ message: 'Flow deleted' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new ChatbotController();
