import mongoose from 'mongoose';
import ChatbotFlow from '../models/ChatbotFlow.js';
import ChatSession from '../models/ChatSession.js';
import Business from '../models/Business.js';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import actionHandler from './actionHandler.js';
import chatbotSeederService from './chatbotSeederService.js';
import usageService from './usageService.js';

const DEFAULT_REPLY = 'No flow configured. Please contact admin.';

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const normalizeBusinessCategory = (value) => {
  const raw = normalizeText(value);
  if (raw === 'e_commerce' || raw === 'e-commerce') return 'ecommerce';
  if (raw === 'booking') return 'booking';
  return 'ecommerce';
};

const inferSemanticStepAlias = (stepName) => {
  const normalized = normalizeText(stepName);
  if (!normalized) return null;
  if (normalized === 'main_menu' || normalized === 'options' || normalized.includes('menu')) return 'menu';
  if (normalized.includes('service')) return 'ask_service';
  if (normalized.includes('name')) return 'ask_name';
  if (normalized.includes('age')) return 'ask_age';
  if (normalized.includes('date')) return 'ask_date';
  if (normalized.includes('time')) return 'ask_time';
  return null;
};

class ChatbotEngine {
  normalizeAwaitingField(fieldName) {
    const normalized = normalizeText(fieldName);
    if (!normalized) return null;
    if (normalized === 'user_details') return 'age';
    if (normalized === 'upi' || normalized === 'upi_id') return 'upiId';
    return normalized;
  }

  async getBusinessContext(businessId) {
    const business = await Business.findById(businessId)
      .select('category businessType')
      .lean();

    return {
      business,
      category: normalizeBusinessCategory(
        business?.businessType || business?.category || 'ecommerce'
      ),
    };
  }

  async getOrCreateSession(phone, businessId) {
    const normalizedPhone = String(phone || '').trim();

    // ─── Phase 2: Resolve Customer ───
    let customer = await Customer.findOne({ phone: normalizedPhone, businessId });
    if (!customer) {
      customer = await Customer.create({ phone: normalizedPhone, businessId, status: 'new' });
    }
    customer.lastInteraction = new Date();
    await customer.save();

    let session = await ChatSession.findOne({
      phone: normalizedPhone,
      businessId,
    });

    if (!session) {
      session = await ChatSession.create({
        phone: normalizedPhone,
        businessId,
        customerId: customer._id,
        currentStep: 'start',
        awaitingField: null,
        collectedData: {},
        context: {},
        mode: 'BOT',
      });
    } else if (!session.customerId) {
      session.customerId = customer._id;
      await session.save();
    }

    return { session, customer };
  }

  parseTriggers(triggerValue) {
    const raw = String(triggerValue || '').trim();
    if (!raw) return [];
    if (raw === '*') return ['*'];

    return raw
      .split(/[,\n]/)
      .map((trigger) => normalizeText(trigger))
      .filter(Boolean);
  }

  triggerMatches(flow, normalizedMessage) {
    const triggers = this.parseTriggers(flow?.trigger);
    if (triggers.includes('*')) return true;
    return triggers.includes(normalizedMessage);
  }

  findStepFlow(flows, currentStep, normalizedMessage) {
    const stepFlows = flows.filter((flow) => normalizeText(flow.step) === normalizeText(currentStep));

    const exactMatch = stepFlows.find((flow) => {
      const triggers = this.parseTriggers(flow.trigger);
      return !triggers.includes('*') && triggers.includes(normalizedMessage);
    });

    if (exactMatch) return exactMatch;

    return stepFlows.find((flow) => this.parseTriggers(flow.trigger).includes('*')) || null;
  }

  findFlowWithAliases(flows, currentStep, normalizedMessage) {
    const directMatch = this.findStepFlow(flows, currentStep, normalizedMessage);
    if (directMatch) return directMatch;

    const aliasStep = inferSemanticStepAlias(currentStep);
    if (aliasStep && aliasStep !== normalizeText(currentStep)) {
      return this.findStepFlow(flows, aliasStep, normalizedMessage);
    }

    return null;
  }

  inferAwaitingField(flow, stepName = '') {
    const action = String(flow?.action || '').trim().toUpperCase();
    if (action.startsWith('SAVE_')) {
      const inferred = action
        .replace(/^SAVE_/, '')
        .toLowerCase();

      return this.normalizeAwaitingField(inferred);
    }

    const normalizedStep = normalizeText(stepName);
    if (normalizedStep.startsWith('ask_')) {
      return this.normalizeAwaitingField(normalizedStep.replace(/^ask_/, ''));
    }

    return null;
  }

  async getSystemFallback(businessId, vars = {}) {
    const fallbackFlow = await ChatbotFlow.findOne({
      businessId,
      step: 'system',
      trigger: 'fallback',
      isActive: true,
    }).lean();

    const invalidInputFlow = await ChatbotFlow.findOne({
      businessId,
      step: 'system',
      trigger: 'invalid_input',
      isActive: true,
    }).lean();

    const replyTemplate =
      fallbackFlow?.reply ||
      invalidInputFlow?.reply ||
      DEFAULT_REPLY;

    return actionHandler.interpolate(replyTemplate, vars);
  }

  async logDebug({ businessId, phone, currentStep, message, matchedFlow, actionExecuted, nextStep, collectedData }) {
    console.log('[ChatbotEngine]', {
      businessId: String(businessId),
      phone,
      currentStep,
      message,
      matchedFlow: matchedFlow
        ? {
            id: String(matchedFlow._id),
            step: matchedFlow.step,
            trigger: matchedFlow.trigger,
          }
        : null,
      actionExecuted,
      nextStep,
      collectedData,
    });
  }

  async trackEvent(businessId, customerId, eventType, data = {}) {
    try {
      if (!mongoose.Types.ObjectId.isValid(businessId)) return;

      await AnalyticsEvent.create({
        businessId,
        customerId,
        eventType,
        eventData: data,
        source: 'chatbot',
      });
    } catch (error) {
      console.error('[ChatbotEngine] Analytics event failed:', error.message);
    }
  }

  async chatbotEngine({ message, phone, businessId }) {
    try {
      if (!businessId) {
        throw new Error('businessId is required');
      }

      const resolvedBusinessId = mongoose.Types.ObjectId.isValid(businessId)
        ? new mongoose.Types.ObjectId(businessId)
        : businessId;

      const normalizedMessage = normalizeText(message);
      const { session, customer } = await this.getOrCreateSession(phone, resolvedBusinessId);

      if (session.mode === 'HUMAN') {
        return null;
      }

      const { category } = await this.getBusinessContext(resolvedBusinessId);
      const currentStep = session.currentStep || 'start';

      await chatbotSeederService.ensureCoreFlowCoverage(resolvedBusinessId, category);

      const flows = await ChatbotFlow.find({
        businessId: resolvedBusinessId,
        category,
        isActive: true,
      }).lean();

      let matchedFlow = null;
      let previousStep = currentStep;
      let actionExecuted = 'NONE';

      const dataSnapshot = JSON.parse(JSON.stringify(session.collectedData || {}));
      const contextSnapshot = JSON.parse(JSON.stringify(session.context || {}));
      const awaitingFieldSnapshot = session.awaitingField;

      if (session.awaitingField) {
        const awaitingField = session.awaitingField;
        session.collectedData = { ...(session.collectedData || {}), [awaitingField]: String(message || '').trim() };
        session.context = { ...(session.context || {}), [awaitingField]: String(message || '').trim() };
        session.awaitingField = null;
        session.markModified('collectedData');
        session.markModified('context');

        matchedFlow = this.findFlowWithAliases(flows, currentStep, '*');
      } else {
        matchedFlow = this.findFlowWithAliases(flows, currentStep, normalizedMessage);
      }

      if (!matchedFlow) {
        const hasCurrentStepFlows = flows.some(
          (flow) => normalizeText(flow.step) === normalizeText(currentStep)
        );
        const aliasStep = inferSemanticStepAlias(currentStep);
        const hasAliasFlows = aliasStep
          ? flows.some((flow) => normalizeText(flow.step) === aliasStep)
          : false;

        if (!hasCurrentStepFlows && !hasAliasFlows) {
          session.currentStep = 'start';
          session.awaitingField = null;
          session.markModified('currentStep');
        }

        const fallbackMessage = await this.getSystemFallback(resolvedBusinessId, {
          ...(session.context || {}),
          ...(session.collectedData || {}),
        });

        await this.logDebug({
          businessId: resolvedBusinessId,
          phone,
          currentStep,
          message,
          matchedFlow: null,
          actionExecuted: 'NONE',
          nextStep: (hasCurrentStepFlows || hasAliasFlows) ? currentStep : 'start',
          collectedData: session.collectedData || {},
        });

        await session.save();

        return {
          response: fallbackMessage,
          text: fallbackMessage,
          type: 'text',
          products: [],
          payment: null,
        };
      }

      let actionResult = { success: true };
      actionExecuted = String(matchedFlow.action || 'NONE').toUpperCase();

      if (actionExecuted && actionExecuted !== 'NONE' && actionExecuted !== 'JUST_SEND_REPLY') {
        actionResult = await actionHandler.executeAction(actionExecuted, {
          message,
          phone: String(phone || '').trim(),
          businessId: resolvedBusinessId,
          session,
          customer, // Ensure customer is passed to actions
        });
      }

      if (actionResult?.success === false) {
        session.currentStep = previousStep;
        session.awaitingField = awaitingFieldSnapshot;
        session.collectedData = dataSnapshot;
        session.context = contextSnapshot;
        session.markModified('collectedData');
        session.markModified('context');

        await this.logDebug({
          businessId: resolvedBusinessId,
          phone,
          currentStep: previousStep,
          message,
          matchedFlow,
          actionExecuted,
          nextStep: previousStep,
          collectedData: session.collectedData || {},
        });

        await session.save();

        return {
          response: actionResult.text || actionResult.error || DEFAULT_REPLY,
          text: actionResult.text || actionResult.error || DEFAULT_REPLY,
          type: actionResult.type || 'text',
          products: actionResult.products || [],
          payment: actionResult.payment || null,
        };
      }

      const nextStep = String(actionResult?.nextStep || matchedFlow.nextStep || previousStep || 'start').trim();
      session.currentStep = nextStep;

      const nextWildcardFlow = this.findStepFlow(flows, nextStep, '*');
      session.awaitingField = actionResult?.awaitingField || this.inferAwaitingField(nextWildcardFlow, nextStep);

      let replyText =
        actionResult?.text ||
        matchedFlow.reply ||
        (await this.getSystemFallback(resolvedBusinessId, {
          ...(session.context || {}),
          ...(session.collectedData || {}),
        }));

      replyText = actionHandler.interpolate(replyText, {
        ...(session.context || {}),
        ...(session.collectedData || {}),
      });

      const hasQuota = await usageService.canSendMessages(resolvedBusinessId);
      if (!hasQuota) {
        return {
          response: 'Monthly message limit reached. Please upgrade your plan.',
          text: 'Monthly message limit reached. Please upgrade your plan.',
          type: 'text',
          products: [],
          payment: null,
        };
      }

      await this.logDebug({
        businessId: resolvedBusinessId,
        phone,
        currentStep: previousStep,
        message,
        matchedFlow,
        actionExecuted,
        nextStep,
        collectedData: session.collectedData || {},
      });

      await this.trackEvent(resolvedBusinessId, session.customerId, 'flow_step_reach', {
        step: nextStep,
        flowId: matchedFlow._id,
        category,
      });

      await session.save();

      return {
        response: replyText,
        text: replyText,
        type: actionResult?.type || 'text',
        products: actionResult?.products || [],
        payment: actionResult?.payment || null,
      };
    } catch (error) {
      console.error('[ChatbotEngine] Fatal error:', error);
      return {
        response: 'Internal system error.',
        text: 'Internal system error.',
        type: 'text',
        products: [],
        payment: null,
      };
    }
  }
}

export default new ChatbotEngine();
