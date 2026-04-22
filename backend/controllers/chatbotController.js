import ChatbotFlow from '../models/ChatbotFlow.js';
import Conversation from '../models/Conversation.js';
import logger from '../utils/logger.js';

import Business from '../models/Business.js';
import ChatbotEngine from '../services/chatbotEngine.js';
import chatbotSeederService from '../services/chatbotSeederService.js';
import { getBusinessPlanConfig, resolveBusinessPlan } from '../config/plans.js';

class ChatbotController {
  constructor() {
    this.createFlow = this.createFlow.bind(this);
    this.getFlows = this.getFlows.bind(this);
    this.updateFlow = this.updateFlow.bind(this);
    this.deleteFlow = this.deleteFlow.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.getChatHistory = this.getChatHistory.bind(this);
    this.seedFlows = this.seedFlows.bind(this);
  }

  getPayload(body = {}) {
    return {
      triggerKeywords: Array.isArray(body.triggerKeywords) ? body.triggerKeywords : [],
      responseTemplate: body.responseTemplate || body.reply,
      step: body.step,
      nextStep: body.nextStep,
      action: body.action || 'NONE',
      category: body.category,
      isActive: body.isActive ?? true,
      isSystem: body.isSystem ?? false,
    };
  }

  async getBusinessPlanDetails(businessId) {
    const business = await Business.findById(businessId)
      .select('plan subscription.plan category businessType')
      .lean();

    if (!business) {
      throw new Error('Business account not found in registry');
    }

    const plan = resolveBusinessPlan(business);
    const config = getBusinessPlanConfig(business);

    return { business, plan, config };
  }

  async createFlow(req, res) {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        return res.status(400).json({ message: 'Business is not mapped to this account. Please login again.' });
      }

      const { business, config } = await this.getBusinessPlanDetails(businessId);
      let category = (business?.category || business?.businessType || 'ecommerce').toLowerCase();
      if (category === 'e_commerce') category = 'ecommerce';

      const count = await ChatbotFlow.countDocuments({
        businessId,
        isActive: true,
        isSystem: false,
      });

      if (config.maxFlows !== Infinity && count >= config.maxFlows) {
        return res.status(403).json({
          code: 'FLOW_LIMIT_REACHED',
          message: 'Upgrade your plan to add more flows'
        });
      }

      const flow = await ChatbotFlow.create({
        ...this.getPayload(req.body),
        businessId,
        category: req.body.category || category,
        isSystem: false, // User created flows are never system flows
      });

      res.status(201).json(flow);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getFlows(req, res) {
    try {
      const businessId = req.businessId;

      if (!businessId) {
        return res.status(400).json({ message: 'Business context missing.' });
      }

      const { plan, config } = await this.getBusinessPlanDetails(businessId);

      // Show only user-created, non-system flows for settings UI
      const allFlows = await ChatbotFlow.find({ 
        businessId, 
        isSystem: false 
      }).sort({ createdAt: -1 });

      const activeCount = allFlows.filter(f => f.isActive).length;
      const allowedFlows = config.maxFlows === Infinity
        ? allFlows
        : allFlows.slice(0, config.maxFlows);
      const remaining = config.maxFlows === Infinity ? Infinity : Math.max(0, config.maxFlows - activeCount);
      const modeMessages = {
        starter: 'Starter automation enabled',
        template: 'Basic features enabled',
        smart: 'Smart automation enabled',
        advanced: 'Advanced automation enabled',
      };

      res.json({
        flows: allowedFlows,
        metadata: {
          total: config.maxFlows,
          used: activeCount,
          limit: config.maxFlows,
          remaining,
          mode: config.mode,
          plan,
          message: config.mode === 'template'
            ? 'Basic features enabled'
            : modeMessages[config.mode] || 'Upgrade for advanced automation'
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updateFlow(req, res) {
    try {
      const businessId = req.businessId;
      const payload = this.getPayload(req.body);

      const flow = await ChatbotFlow.findOneAndUpdate(
        { _id: req.params.id, businessId, isSystem: false },
        payload,
        { new: true, runValidators: true }
      );
      if (!flow) return res.status(404).json({ message: 'Flow not found or immutable' });
      res.json(flow);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async deleteFlow(req, res) {
    try {
      const businessId = req.businessId;
      const flow = await ChatbotFlow.findOneAndDelete({ 
        _id: req.params.id, 
        businessId,
        isSystem: false 
      });
      if (!flow) return res.status(404).json({ message: 'Flow not found or immutable' });

      res.json({ message: 'Flow deleted' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getChatHistory(req, res) {
    try {
      const businessId = req.businessId;
      const phone = String(req.query?.phone || '').trim();

      if (!phone) {
        return res.status(400).json({ message: 'phone is required' });
      }

      const conversation = await Conversation.findOne({ phone, businessId }).lean();
      if (!conversation) {
        return res.json([]);
      }

      // Map to legacy format for frontend compatibility
      const messages = (conversation.messages || []).map(m => ({
        message: m.text,
        senderType: m.sender === 'bot' ? 'chatbot' : m.sender,
        createdAt: m.timestamp
      }));

      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async sendMessage(req, res) {
    try {
      const businessId = req.businessId;
      const { plan } = await this.getBusinessPlanDetails(businessId);
      const phone = String(req.body?.phone || '').trim();
      const rawMessage = req.body?.message;
      const message = typeof rawMessage === 'object' && rawMessage !== null
        ? rawMessage
        : String(rawMessage || '').trim();

      if (!phone || (!message && typeof message !== 'object')) {
        return res.status(400).json({ message: 'phone and message are required' });
      }

      const botResult = await ChatbotEngine.chatbotEngine({
        message,
        phone,
        businessId,
      });

      return res.json({
        response: botResult?.response || botResult?.text,
        text: botResult?.text,
        products: botResult?.products || [],
        type: botResult?.type || 'text',
        payment: botResult?.payment || null,
        nextStep: botResult?.nextStep,
        plan
      });
    } catch (error) {
      logger.error('[ChatbotController] sendMessage error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async seedFlows(req, res) {
    try {
      const businessId = req.businessId;
      const { plan } = await this.getBusinessPlanDetails(businessId);

      await chatbotSeederService.seedFlowsForBusiness(businessId, plan);

      res.json({ 
        success: true, 
        message: `Chatbot flows successfully provisioned for your ${plan} plan.` 
      });
    } catch (error) {
      logger.error('[ChatbotController] seedFlows error:', error);
      const status = error.message.includes('not found') ? 404 : 500;
      res.status(status).json({ message: error.message || 'Failed to provision flows.' });
    }
  }
}

export default new ChatbotController();
