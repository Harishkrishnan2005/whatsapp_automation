import mongoose from 'mongoose';
import logger from '../utils/logger.js';

import ChatbotFlow from '../models/ChatbotFlow.js';
import ChatSession from '../models/ChatSession.js';
import Customer from '../models/Customer.js';
import Message from '../models/Message.js';
import actionHandler from './actionHandler.js';
import Business from '../models/Business.js';
import { resolveBusinessPlan } from '../config/plans.js';
import conversationTracker from '../utils/conversationTracker.js';

const FALLBACK_24_HOURS = 'We will respond within 24 hrs';

class ChatbotEngine {
  sanitizeProductsForMessage(products = []) {
    if (!Array.isArray(products)) {
      return [];
    }

    return products
      .filter((item) => mongoose.Types.ObjectId.isValid(item?._id || item?.id))
      .map((item) => ({
        _id: item._id || item.id,
        name: item.name,
        mrp: item.mrp,
        offerPrice: item.offerPrice ?? item.price,
        offerPercentage: item.offerPercentage,
        unitType: item.unitType,
        category: item.category,
        image: item.image,
        redirectUrl: item.redirectUrl,
      }));
  }

  normalizeStep(step) {
    return String(step || 'start').trim().toLowerCase();
  }

  normalizeKeywords(flow) {
    return (flow?.triggerKeywords || [])
      .map((keyword) => String(keyword || '').trim().toLowerCase())
      .filter(Boolean);
  }

  async getBusinessContext(businessId) {
    const business = await Business.findById(businessId)
      .select('plan subscription.plan')
      .lean();

    return {
      business,
      plan: resolveBusinessPlan(business),
    };
  }

  /**
   * Fetch or create a session for the user
   */
  async getOrCreateSession(phone, businessId) {
    const normalizedPhone = String(phone || '').trim();

    // Ensure customer exists
    let customer = await Customer.findOne({ phone: normalizedPhone, businessId });
    if (!customer) {
      customer = await Customer.create({ phone: normalizedPhone, businessId, status: 'new' });
    }

    let session = await ChatSession.findOne({ phone: normalizedPhone, businessId });
    if (!session) {
      session = await ChatSession.create({
        phone: normalizedPhone,
        businessId,
        customerId: customer._id,
        currentStep: 'start',
        awaitingField: null,
        collectedData: {},
        context: {},
        mode: 'BOT'
      });
    }

    if (!session.currentStep) {
      session.currentStep = 'start';
    }

    return { session, customer };
  }

  /**
   * Match flow logic using the active step first, then global keyword flows.
   * PRIORITY:
   * 1. Exact keyword match in current step
   * 2. Exact keyword match in global flows (step = '*')
   * 3. Wildcard (*) match in current step only
   */
  findMatchedFlow(flows, currentStep, message) {
    const normalizedMsg = String(message || '').trim().toLowerCase();
    const normalizedStep = this.normalizeStep(currentStep);
    const stepFlows = flows.filter((flow) => this.normalizeStep(flow.step) === normalizedStep);
    const globalFlows = flows.filter((flow) => this.normalizeStep(flow.step) === '*');

    // 1. Exact match in current step (exclude '*' keyword here)
    const exactMatch = stepFlows.find((flow) => {
      const keywords = this.normalizeKeywords(flow);
      return keywords.some((keyword) => keyword === normalizedMsg && keyword !== '*');
    });

    if (exactMatch) {
      return exactMatch;
    }

    // 2. Exact match in global flows
    const globalExactMatch = globalFlows.find((flow) => {
      const keywords = this.normalizeKeywords(flow);
      return keywords.some((keyword) => keyword === normalizedMsg && keyword !== '*');
    });

    if (globalExactMatch) {
      return globalExactMatch;
    }

    // 3. Wildcard match ONLY in current step
    return stepFlows.find((flow) => this.normalizeKeywords(flow).includes('*')) || null;
  }

  /**
   * Main entry point
   * Refactored for strict "Wait-for-Input" execution
   */
  async chatbotEngine({ message, phone, businessId }) {
    try {
      const isStructured = typeof message === 'object' && message !== null;
      const normalizedMsg = isStructured ? (message.label || JSON.stringify(message)) : String(message || '').trim();
      const normalizedPhone = String(phone || '').trim();

      if (!businessId || !normalizedPhone || !normalizedMsg) {
        return {
          response: 'Invalid request. phone, message, and businessId are required.',
          text: 'Invalid request. phone, message, and businessId are required.',
          type: 'text',
          nextStep: 'start'
        };
      }

      const resolvedBusinessId = mongoose.Types.ObjectId.isValid(businessId)
        ? new mongoose.Types.ObjectId(businessId)
        : businessId;
      const { plan } = await this.getBusinessContext(resolvedBusinessId);

      // 1. Get/Create Session and Customer
      const { session, customer } = await this.getOrCreateSession(phone, resolvedBusinessId);
      await Customer.findByIdAndUpdate(customer._id, { lastActivity: new Date() });

      // 2. Logging and Interaction Tracking
      const currentStep = session.currentStep || 'start';
      logger.info(`[Engine] Incoming: "${normalizedMsg}" from: ${phone} (Step: ${currentStep})`);
      
      // Save incoming message immediately
      await Message.create({
        customerId: customer._id,
        message: normalizedMsg,
        type: 'incoming',
        senderType: 'customer',
        businessId: resolvedBusinessId,
      });

      // Unified Conversation Persistence
      await conversationTracker.addMessage(resolvedBusinessId, normalizedPhone, 'customer', normalizedMsg, {
        customerId: customer._id,
        assignedStaffId: customer.assignedTo || null,
      });

      // 3. Guards
      if (session.mode === 'HUMAN') return null;

      // 4. Structured Action Handling (Bypass keyword matching)
      if (isStructured && message.action) {
        logger.info(`[Engine] Structured Action Detected: ${message.action}`);
        const actionToRun = String(message.action).toUpperCase();
        
        const actionResult = await actionHandler.executeAction(actionToRun, {
          message: normalizedMsg,
          payload: message.payload,
          phone: normalizedPhone,
          businessId: resolvedBusinessId,
          session,
          customer,
        });

        const nextStep = actionResult.nextStep || currentStep;
        let finalReply = actionResult.text || "";
        finalReply = actionHandler.interpolate(finalReply, {
          ...(session.context || {}),
          ...(session.collectedData || {}),
        });

        await this.finalizeTurn(session, customer, finalReply, nextStep, resolvedBusinessId, actionResult.products, actionResult.awaitingField || null);
        
        return {
          response: finalReply,
          text: finalReply,
          type: actionResult.type || 'text',
          products: actionResult.products || [],
          payment: actionResult.payment || null,
          nextStep: nextStep,
          plan
        };
      }

      // 5. Global Reset Keywords (Always prioritized for text input)
      const resetKeywords = ["hi", "hello", "start", "menu", "restart", "back"];
      const lowerInput = normalizedMsg.toLowerCase();
      if (resetKeywords.includes(lowerInput)) {
        session.currentStep = 'start';
        session.awaitingField = null;
        session.collectedData = {};
        session.context = {};
        session.markModified('awaitingField');
        session.markModified('collectedData');
        session.markModified('context');
        
        const startFlow = await ChatbotFlow.findOne({
          businessId: resolvedBusinessId,
          step: 'start',
          isActive: true
        }).sort({ createdAt: 1 }).lean();
        const reply = startFlow?.responseTemplate || FALLBACK_24_HOURS;
        
        await this.finalizeTurn(session, customer, reply, startFlow?.nextStep || 'start', resolvedBusinessId);
        return { response: reply, text: reply, type: 'text', nextStep: startFlow?.nextStep || 'start', plan };
      }

      // 5. Flow Matching (Active step + global menu + fallback)
      const flows = await ChatbotFlow.find({
        businessId: resolvedBusinessId,
        isActive: true,
        $or: [
          { step: currentStep },
          { step: '*' },
          { step: 'system', isSystem: true }
        ]
      }).lean();

      const matchedFlow = this.findMatchedFlow(flows, currentStep, lowerInput);

      // 6. Handle "No Match" -> Fallback to System
      if (!matchedFlow) {
        logger.warn(`[Engine] No match for "${normalizedMsg}" at step "${currentStep}"`);
        const fallbackFlow = flows.find(f => f.step === 'system' && f.isSystem);
        const reply = fallbackFlow?.responseTemplate || FALLBACK_24_HOURS;
        
        // We don't advance the step on error, we just stay and repeat/fallback
        await this.finalizeTurn(session, customer, reply, currentStep, resolvedBusinessId);
        return { response: reply, text: reply, type: 'text', nextStep: currentStep, plan };
      }

      logger.info(`[Engine] Matched Flow: ${matchedFlow.step} -> ${matchedFlow.nextStep} (Action: ${matchedFlow.action || 'NONE'})`);

      // 7. Execute Action (Validation & Logic) for the CURRENT step's message
      const actionToRun = String(matchedFlow.action || 'NONE').toUpperCase();
      let actionResult = { success: true };

      if (actionToRun !== 'NONE') {
        actionResult = await actionHandler.executeAction(actionToRun, {
          message: normalizedMsg,
          phone: String(phone || '').trim(),
          businessId: resolvedBusinessId,
          session,
          customer,
        });
      }

      // 8. Handle Action/Validation Failure
      if (actionResult.success === false) {
        const errorReply = actionResult.text || actionResult.error || "Invalid input. Please try again.";
        // On error, stay at current step so user can retry the SAME input field
        await this.finalizeTurn(
          session,
          customer,
          errorReply,
          currentStep,
          resolvedBusinessId,
          [],
          actionResult.awaitingField ?? session.awaitingField ?? null
        );
        return { 
          response: errorReply, 
          text: errorReply, 
          type: 'text',
          nextStep: currentStep,
          plan
        };
      }

      // 9. Move to Next Step & Prepare Next Prompt
      // Important: We do NOT execute the next step's action here. We stop and wait for a new message.
      const nextStep = actionResult.nextStep || matchedFlow.nextStep || currentStep;
      
      // Interpolate variables (e.g. {{name}}, {{date}}) into the response template
      let finalReply = actionResult.text || matchedFlow.responseTemplate || "";
      finalReply = actionHandler.interpolate(finalReply, {
        ...(session.context || {}),
        ...(session.collectedData || {}),
      });

      // 10. Persist and WAIT for user's next input
      await this.finalizeTurn(
        session,
        customer,
        finalReply,
        nextStep,
        resolvedBusinessId,
        actionResult.products,
        actionResult.awaitingField ?? null
      );

      return {
        response: finalReply,
        text: finalReply,
        type: actionResult.type || 'text',
        products: actionResult.products || [],
        payment: actionResult.payment || null,
        nextStep: nextStep,
        plan
      };

    } catch (error) {
      logger.error("[ChatbotEngine] Critical Error:", error);
      return {
        response: FALLBACK_24_HOURS,
        text: FALLBACK_24_HOURS,
        nextStep: "start"
      };
    }
  }

  /**
   * Helper to persist session state and outgoing message
   */
  async finalizeTurn(session, customer, replyText, nextStep, businessId, products = [], awaitingField = null) {
    session.currentStep = nextStep;
    session.awaitingField = awaitingField;
    
    // Funnel Tracking: Store step progression
    if (!session.stepsCompleted) session.stepsCompleted = [];
    if (!session.stepsCompleted.includes(nextStep)) {
      session.stepsCompleted.push(nextStep);
    }
    
    // Track completion if the user reaches a success state
    const completionSteps = ['SUCCESS', 'ORDER_CONFIRMED', 'APPOINTMENT_CONFIRMED', 'COMPLETED', 'THANK_YOU'];
    if (completionSteps.includes(String(nextStep).toUpperCase())) {
      session.isCompleted = true;
      session.completedAt = new Date();
    }
    session.lastInteractionAt = new Date();
    session.markModified('awaitingField');
    await session.save();

    await Message.create({
      customerId: customer._id,
      message: replyText,
      type: 'outgoing',
      senderType: 'chatbot',
      products: this.sanitizeProductsForMessage(products),
      businessId,
    });

    // Unified Conversation Persistence
    await conversationTracker.addMessage(businessId, session.phone, 'bot', replyText, {
      customerId: customer._id,
      assignedStaffId: customer.assignedTo || null,
    });
  }
}


export default new ChatbotEngine();
