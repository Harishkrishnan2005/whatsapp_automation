import ChatbotFlow from '../models/ChatbotFlow.js';

class ChatbotController {
  getPayload(body = {}) {
    return {
      trigger: body.trigger,
      reply: body.reply,
      step: body.step,
      nextStep: body.nextStep,
      action: body.action,
      isActive: body.isActive ?? true,
    };
  }

  async createFlow(req, res) {
    try {
      const flow = await ChatbotFlow.create({
        ...this.getPayload(req.body),
        businessId: req.user.businessId,
      });
      res.status(201).json(flow);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getFlows(req, res) {
    try {
      const businessId = req.user.businessId;
      const flows = await ChatbotFlow.find({ businessId }).sort({ createdAt: -1 });
      res.json(flows);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updateFlow(req, res) {
    try {
      const flow = await ChatbotFlow.findOneAndUpdate(
        { _id: req.params.id, businessId: req.user.businessId },
        this.getPayload(req.body),
        { new: true, runValidators: true }
      );
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
