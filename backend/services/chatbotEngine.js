import mongoose from 'mongoose';
import ChatbotFlow from '../models/ChatbotFlow.js';
import ChatSession from '../models/ChatSession.js';
import Business from '../models/Business.js';
import actionHandler from './actionHandler.js';
import AnalyticsEvent from '../models/AnalyticsEvent.js'; // Added import

const normalize = (text) => String(text || '').toLowerCase().trim();
const defaultReply = 'Sorry, I did not understand that. Please try again.';
const splitTriggers = (value) =>
  String(value || '')
    .split(/[,\n]/)
    .map((item) => normalize(item))
    .filter(Boolean);

class ChatbotEngine {
  async trackEvent(businessId, customerId, eventType, data = {}) {
    try {
      await AnalyticsEvent.create({
        businessId,
        customerId,
        eventType,
        eventData: data,
        source: 'chatbot',
      });
    } catch (err) {
      console.error('[Analytics] Failed to track event:', err.message);
    }
  }

  async buildLegacyReply({ flow, session, message, phone, businessId }) {
    console.log('[DEBUG] Executing buildLegacyReply for flow:', flow._id, 'Action:', flow.action);
    const normalizedMessage = normalize(message);
    const triggers = splitTriggers(flow.trigger || '');

    const isMatched = triggers.includes('*') || triggers.includes(normalizedMessage);

    if (!isMatched) {
      return { response: defaultReply, text: defaultReply, type: 'text', products: [] };
    }

    if (!session.context) session.context = {};

    let responseText = String(flow.reply || '').trim();
    let responseType = 'text';
    let products = [];

    if (flow.action && flow.action !== 'NONE') {
      const actionResult = await actionHandler.executeAction(flow.action, {
        message,
        phone,
        businessId,
        session,
      });

      if (actionResult) {
        if (actionResult.text) responseText = actionResult.text;
        if (actionResult.type) responseType = actionResult.type;
        if (actionResult.products) products = actionResult.products;
        if (actionResult.contextDelta) {
          session.context = { ...(session.context || {}), ...actionResult.contextDelta };
          session.markModified('context');
        }
        
        // Track conversions for specific actions
        if (['CREATE_ORDER', 'BOOK_APPOINTMENT'].includes(flow.action)) {
          this.trackEvent(businessId, session.customerId, 'conversion', { action: flow.action });
        }
      }
    }

    const nextStep = String(flow.nextStep || 'start').trim();
    session.currentNode = nextStep;
    await session.save();

    // Track step reach
    this.trackEvent(businessId, session.customerId, 'flow_step_reach', { 
      step: flow.step, 
      nextStep: nextStep,
      flowId: flow._id 
    });

    const interpolatedReply = actionHandler.interpolate(responseText, session.context || {});

    return {
      response: interpolatedReply || defaultReply,
      text: interpolatedReply || defaultReply,
      type: responseType || 'text',
      products: products || [],
    };
  }

  async chatbotEngine({ message, phone, businessId }) {
    try {
      if (!businessId) throw new Error('businessId is required');

      const resolvedBusinessId = mongoose.Types.ObjectId.isValid(String(businessId))
        ? new mongoose.Types.ObjectId(String(businessId))
        : null;

      if (!resolvedBusinessId) throw new Error('Invalid businessId');

      const business = await Business.findById(resolvedBusinessId).select('category').lean();
      const category = business?.category || 'ecommerce';

      const normalizedPhone = String(phone).trim();
      const normalizedMessage = normalize(message);

      let session = await ChatSession.findOne({ phone: normalizedPhone, businessId: resolvedBusinessId });

      if (!session) {
        session = await ChatSession.create({
          phone: normalizedPhone,
          businessId: resolvedBusinessId,
          currentNode: 'start',
        });
        
        // Track flow start
        this.trackEvent(resolvedBusinessId, null, 'flow_start', { phone: normalizedPhone });
      }

      const graphFlow = await ChatbotFlow.findOne({
        businessId: resolvedBusinessId,
        category,
        isActive: true,
        'nodes.0': { $exists: true },
      }).sort({ updatedAt: -1, createdAt: -1 }).lean();

      if (graphFlow) {
        const currentNode = graphFlow.nodes.find((node) => node.id === session.currentNode)
          || graphFlow.nodes.find((node) => node.type === 'start')
          || graphFlow.nodes[0];

        const exactEdge = graphFlow.edges.find(e => String(e.source) === String(currentNode?.id) && splitTriggers(e.label).includes(normalizedMessage));
        const partialEdge = graphFlow.edges.find(e => String(e.source) === String(currentNode?.id) && splitTriggers(e.label).some(t => normalizedMessage.includes(t)));
        const wildcardEdge = graphFlow.edges.find(e => String(e.source) === String(currentNode?.id) && splitTriggers(e.label).includes('*'));

        const matchedEdge = exactEdge || partialEdge || wildcardEdge;

        const nextNode = matchedEdge
          ? graphFlow.nodes.find((node) => node.id === matchedEdge.target)
          : graphFlow.nodes.find((node) => node.type === 'fallback');

        if (!nextNode) {
          const errorReply = await actionHandler.getSystemReply(resolvedBusinessId, 'invalid_input', defaultReply, session.context);
          this.trackEvent(resolvedBusinessId, session.customerId, 'flow_drop_off', { step: session.currentNode });
          return { response: errorReply, text: errorReply, type: 'text', products: [] };
        }

        session.currentNode = nextNode.id;
        
        // Track step reach
        this.trackEvent(resolvedBusinessId, session.customerId, 'flow_step_reach', { 
          nodeId: nextNode.id, 
          nodeType: nextNode.type,
          flowId: graphFlow._id 
        });

        let responseText = nextNode.data?.message || '';
        let responseType = nextNode.data?.type || 'text';
        let products = [];

        if (nextNode.data?.action && nextNode.data.action !== 'NONE') {
          const actionResult = await actionHandler.executeAction(nextNode.data.action, {
            message,
            phone,
            businessId: resolvedBusinessId,
            session,
          });

          if (actionResult) {
            if (actionResult.text) responseText = actionResult.text;
            if (actionResult.type) responseType = actionResult.type;
            if (actionResult.products) products = actionResult.products;
            if (actionResult.contextDelta) {
              session.context = { ...(session.context || {}), ...actionResult.contextDelta };
              session.markModified('context');
            }
            if (['CREATE_ORDER', 'BOOK_APPOINTMENT'].includes(nextNode.data.action)) {
              this.trackEvent(resolvedBusinessId, session.customerId, 'conversion', { action: nextNode.data.action });
            }
          }
        }

        await session.save();
        const finalResponse = actionHandler.interpolate(responseText || defaultReply, session.context);

        return { response: finalResponse, text: finalResponse, type: responseType, products: products };
      }

      // Legacy Mode
      const flows = await ChatbotFlow.find({ businessId: resolvedBusinessId, category, isActive: true }).sort({ updatedAt: -1, createdAt: -1 }).lean();

      const stepExactMatch = flows.find(f => f.step === session.currentNode && splitTriggers(f.trigger).includes(normalizedMessage));
      const startMatch = (session.currentNode !== 'start') 
        ? flows.find(f => f.step === 'start' && splitTriggers(f.trigger).includes(normalizedMessage)) 
        : null;
      const stepWildcardMatch = flows.find(f => f.step === session.currentNode && splitTriggers(f.trigger).includes('*'));

      const flow = stepExactMatch || startMatch || stepWildcardMatch;

      if (!flow) {
        this.trackEvent(resolvedBusinessId, session.customerId, 'flow_drop_off', { step: session.currentNode });
        const fallbackReply = await actionHandler.getSystemReply(resolvedBusinessId, 'invalid_input', defaultReply, session.context);
        return { response: fallbackReply, text: fallbackReply, type: 'text', products: [] };
      }

      return await this.buildLegacyReply({ flow, session, message, phone, businessId: resolvedBusinessId });
    } catch (err) {
      return { response: 'Something went wrong', text: 'Something went wrong', type: 'text', products: [] };
    }
  }
}

export default new ChatbotEngine();

