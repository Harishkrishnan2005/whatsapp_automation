import Flow from '../models/Flow.js';
import Conversation from '../models/Conversation.js';
import logger from '../utils/logger.js';

import Business from '../models/Business.js';
import ChatbotEngine from '../services/chatbotEngine.js';
import chatbotSeederService from '../services/chatbotSeederService.js';
import { checkPlanLimits } from '../utils/featureGuard.js';
import Usage from '../models/Usage.js';
import { getBusinessPlanConfig, resolveBusinessPlan } from '../config/plans.js';
import { resolveFlowTemplateConfig } from '../utils/flowTemplateConfig.js';

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
    const triggers = Array.isArray(body.trigger)
      ? body.trigger
      : Array.isArray(body.triggerKeywords)
        ? body.triggerKeywords
        : body.trigger
          ? [body.trigger]
          : [];

    return resolveFlowTemplateConfig({
      trigger: triggers,
      reply: body.reply || body.responseTemplate || '',
      step: body.step,
      nextStep: body.nextStep,
      action: body.action || 'NONE',
      responseType: body.responseType || 'TEXT',
      templateName: body.templateName || '',
      variableMapping: body.variableMapping || {},
      maxRetries: Number.isInteger(body.maxRetries) ? body.maxRetries : Number(body.maxRetries) || 0,
      retryResponse: body.retryResponse || '',
      fallbackResponse: body.fallbackResponse || '',
      fallbackNextStep: body.fallbackNextStep || '',
      category: body.category,
      isActive: body.isActive ?? true,
      isSystem: body.isSystem ?? false,
    });
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

      const { canCreateFlow, plan } = await checkPlanLimits(businessId);
      
      if (!(await canCreateFlow())) {
        return res.status(403).json({
          code: 'FLOW_LIMIT_REACHED',
          message: `Upgrade your ${plan} plan to add more flows`
        });
      }

      const flow = await Flow.create({
        ...this.getPayload(req.body),
        businessId,
        tenantId: businessId,
        category: req.body.category,
      });

      // Update flows used count
      await Usage.findOneAndUpdate(
        { businessId },
        { $inc: { flowsUsed: 1 } },
        { upsert: true }
      );

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

      const { plan } = await checkPlanLimits(businessId);
      const sub = await (await import('../services/subscriptionService.js')).default.getActiveSubscription(businessId);
      const config = (await import('../config/plans.js')).PLAN_CONFIG[plan];

      const allFlows = await Flow.find({ 
        businessId, 
      }).sort({ createdAt: -1 });

      const used = allFlows.length;
      const remaining = config.maxFlows === Infinity ? Infinity : Math.max(0, config.maxFlows - used);

      res.json({
        flows: allFlows,
        metadata: {
          total: config.maxFlows,
          used,
          limit: config.maxFlows,
          remaining,
          plan,
          expiryDate: sub.endDate,
          message: `Your ${plan} plan limits: ${used}/${config.maxFlows} flows used.`
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

      const flow = await Flow.findOneAndUpdate(
        { _id: req.params.id, businessId },
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
      const flow = await Flow.findOneAndDelete({ 
        _id: req.params.id, 
        businessId,
      });
      if (!flow) return res.status(404).json({ message: 'Flow not found' });

      // Update flows used count
      await Usage.findOneAndUpdate(
        { businessId },
        { $inc: { flowsUsed: -1 } },
        { upsert: true }
      );

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
        messageType: botResult?.messageType || 'TEXT',
        templateName: botResult?.templateName || null,
        payment: botResult?.payment || null,
        nextStep: botResult?.nextStep,
        session: botResult?.session || null,
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
