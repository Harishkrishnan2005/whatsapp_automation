import ChatbotFlow from '../models/ChatbotFlow.js';
import SessionService from './sessionService.js';
import ActionHandler from './actionHandler.js';

const NO_FLOW_CONFIGURED_TEXT = 'No flow configured. Please contact admin.';

const normalizeMessage = (message) => String(message || '').toLowerCase().trim();
const normalizeTrigger = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

class ChatbotEngine {
  async getSystemReply(businessId, trigger) {
    if (!businessId || !trigger) return '';

    const flow = await ChatbotFlow.findOne({
      businessId,
      step: 'system',
      trigger: normalizeTrigger(trigger),
      isActive: true,
    }).lean();

    return String(flow?.reply || '').trim();
  }

  async chatbotEngine({ phone, message, businessId }) {
    try {
      const normalizedMessage = normalizeMessage(message);
      const trigger = normalizeTrigger(normalizedMessage);

      if (!phone || !businessId || !trigger) {
        return {
          response: NO_FLOW_CONFIGURED_TEXT,
          text: NO_FLOW_CONFIGURED_TEXT,
          products: [],
          type: 'text',
        };
      }

      let session = await SessionService.getOrCreateSession(phone, businessId);
      if (SessionService.isSessionExpired(session)) {
        session = await SessionService.handleExpiryReset(session);
      }

      const flow = await ChatbotFlow.findOne({
        businessId,
        trigger,
        step: session.step,
        isActive: true,
      }).lean();

      if (!flow) {
        await SessionService.updateSession(session, { lastMessage: message });
        return {
          response: NO_FLOW_CONFIGURED_TEXT,
          text: NO_FLOW_CONFIGURED_TEXT,
          products: [],
          type: 'text',
        };
      }

      let actionResult = null;
      if (flow.action && flow.action !== 'NONE') {
        actionResult = await ActionHandler.executeAction(flow.action, {
          session,
          businessId,
          phone,
          message,
          flow,
        });
      }

      const nextStep = String(flow.nextStep || session.step || 'start').trim();
      const updatedContext = {
        ...(session.context || {}),
        ...(actionResult?.contextDelta || {}),
      };

      await SessionService.updateSession(session, {
        step: nextStep,
        context: updatedContext,
        lastMessage: message,
      });

      session = await SessionService.getOrCreateSession(phone, businessId);

      let replyText = String(actionResult?.text || flow.reply || '').trim();
      if (!replyText) {
        replyText = NO_FLOW_CONFIGURED_TEXT;
      }

      replyText = SessionService.interpolateTemplate(replyText, session);

      return {
        response: replyText,
        text: replyText,
        products: actionResult?.products || [],
        type: actionResult?.type || (actionResult?.products?.length ? 'product' : 'text'),
        ...(actionResult?.payment ? { payment: actionResult.payment } : {}),
      };
    } catch (error) {
      console.error('[ChatbotEngine] chatbotEngine error:', {
        phone,
        businessId,
        error: error.message,
        stack: error.stack,
      });

      const configuredSystemError = await this.getSystemReply(businessId, 'system_error');
      const response = configuredSystemError || NO_FLOW_CONFIGURED_TEXT;

      return {
        response,
        text: response,
        products: [],
        type: 'text',
      };
    }
  }

  async getSessionInfo(phone, businessId) {
    const session = await SessionService.getOrCreateSession(phone, businessId);
    return SessionService.getSessionMetadata(session);
  }
}

export default new ChatbotEngine();
