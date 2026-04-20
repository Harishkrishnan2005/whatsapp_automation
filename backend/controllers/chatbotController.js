import ChatbotFlow from '../models/ChatbotFlow.js';
import Customer from '../models/Customer.js';
import Message from '../models/Message.js';
import Business from '../models/Business.js';
import ChatbotEngine from '../services/chatbotEngine.js';
import usageService from '../services/usageService.js';

class ChatbotController {
  constructor() {
    this.createFlow = this.createFlow.bind(this);
    this.getFlows = this.getFlows.bind(this);
    this.updateFlow = this.updateFlow.bind(this);
    this.deleteFlow = this.deleteFlow.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
  }

  getPayload(body = {}) {
    return {
      trigger: body.trigger,
      reply: body.reply,
      step: body.step,
      nextStep: body.nextStep,
      action: body.action,
      category: body.category,
      nodes: body.nodes || [],
      edges: body.edges || [],
      isActive: body.isActive ?? true,
    };
  }

  async createFlow(req, res) {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        return res.status(400).json({ message: 'Business is not mapped to this account. Please login again.' });
      }

      const business = await Business.findById(businessId).select('category businessType').lean();
      let category = (business?.businessType || business?.category || 'ecommerce').toLowerCase();
      if (category === 'e_commerce') category = 'ecommerce';

      const flow = await ChatbotFlow.create({
        ...this.getPayload(req.body),
        businessId,
        category, // Auto-populate from business
      });

      // Increment flow usage
      await usageService.incrementFlows(businessId);

      res.status(201).json(flow);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getFlows(req, res) {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        return res.status(400).json({ message: 'Business is not mapped to this account. Please login again.' });
      }

      const flows = await ChatbotFlow.find({ businessId }).sort({ createdAt: -1 });
      res.json(flows);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updateFlow(req, res) {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        return res.status(400).json({ message: 'Business is not mapped to this account. Please login again.' });
      }

      const business = await Business.findById(businessId).select('category businessType').lean();
      let category = (business?.businessType || business?.category || 'ecommerce').toLowerCase();
      if (category === 'e_commerce') category = 'ecommerce';

      const flow = await ChatbotFlow.findOneAndUpdate(
        { _id: req.params.id, businessId },
        { ...this.getPayload(req.body), category },
        { new: true, runValidators: true }
      );
      if (!flow) return res.status(404).json({ message: 'Flow not found' });
      res.json(flow);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async deleteFlow(req, res) {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        return res.status(400).json({ message: 'Business is not mapped to this account. Please login again.' });
      }

      const flow = await ChatbotFlow.findOneAndDelete({ _id: req.params.id, businessId });
      if (!flow) return res.status(404).json({ message: 'Flow not found' });

      // Decrement flow usage
      await usageService.decrementFlows(businessId);

      res.json({ message: 'Flow deleted' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async sendMessage(req, res) {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        return res.status(400).json({ message: 'businessId missing' });
      }

      const phone = String(req.body?.phone || '').trim();
      const message = String(req.body?.message || '').trim();

      if (!phone || !message) {
        return res.status(400).json({ message: 'phone and message are required' });
      }

      console.log('[ChatbotController] Incoming simulator message:', {
        phone,
        message,
        businessId: String(businessId),
      });

      let customer = await Customer.findOne({ phone, businessId });
      if (!customer) {
        customer = await Customer.create({ phone, businessId, name: '' });
      }

      await Message.create({
        customerId: customer._id,
        message,
        type: 'incoming',
        senderType: 'customer',
        businessId,
      });

      const botResult = await ChatbotEngine.chatbotEngine({
        message,
        phone,
        businessId,
      });

      console.log('[ChatbotController] Engine response:', {
        businessId: String(businessId),
        type: botResult?.type || 'text',
        response: botResult?.response || botResult?.text || '',
      });

      await Message.create({
        customerId: customer._id,
        message: botResult.response || botResult.text,
        type: 'outgoing',
        senderType: 'chatbot',
        products: Array.isArray(botResult.products) ? botResult.products : [],
        businessId,
      });

      return res.json({
        response: botResult.response || botResult.text,
        text: botResult.text,
        products: botResult.products || [],
        type: botResult.type || 'text',
        payment: botResult.payment || null,
      });
    } catch (error) {
      console.error('[ChatbotController] sendMessage error:', {
        phone: req.body?.phone,
        businessId: req.businessId ? String(req.businessId) : null,
        error: error.message,
      });
      return res.status(500).json({ message: error.message });
    }
  }
}

export default new ChatbotController();
