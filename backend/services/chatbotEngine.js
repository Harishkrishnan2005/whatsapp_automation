import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import sessionManager from './sessionManager.js';
import flowEngine from './flowEngine.js';
import actionHandler from './actionHandler.js';
import templateEngine from './templateEngine.js';
import conversationTracker from '../utils/conversationTracker.js';
import Message from '../models/Message.js';
import Customer from '../models/Customer.js';

class ChatbotEngine {
  /**
   * Main Process Loop
   * Incoming Message -> Session -> Flow -> Action -> Template -> Response
   */
  async processMessage({ message, phone, businessId }) {
    try {
      const startTime = Date.now();
      const normalizedMsg = typeof message === 'object' ? (message.label || JSON.stringify(message)) : String(message || '').trim();
      
      logger.info(`[ChatbotEngine] Processing message from ${phone} for business ${businessId}`);

      // 1. Session Management
      const { session, customer } = await sessionManager.getSession(phone, businessId);
      
      // Update customer activity
      await Customer.findByIdAndUpdate(customer._id, { lastActivity: new Date() });

      // Save incoming message
      await Message.create({
        customerId: customer._id,
        businessId,
        tenantId: businessId,
        message: normalizedMsg,
        type: 'incoming',
        senderType: 'customer'
      });

      // 2. Guards (Human Override)
      if (session.mode === 'HUMAN') {
        logger.info(`[ChatbotEngine] Session ${phone} is in HUMAN mode. Skipping bot logic.`);
        return null;
      }

      // 3. Flow Matching
      const currentStep = session.currentStep || 'start';
      const matchedFlow = await flowEngine.findMatch(businessId, currentStep, normalizedMsg);

      if (!matchedFlow) {
        logger.warn(`[ChatbotEngine] No flow matched for "${normalizedMsg}" at step "${currentStep}"`);
        return this.handleFallback(session, customer, businessId);
      }

      // 4. Action Execution
      const actionToRun = String(matchedFlow.action || 'NONE').toUpperCase();
      let actionResult = { success: true };

      if (actionToRun !== 'NONE') {
        actionResult = await actionHandler.executeAction(actionToRun, {
          message: normalizedMsg,
          payload: typeof message === 'object' ? message.payload : null,
          phone,
          businessId,
          session,
          customer,
        });
      }

      // 5. Handle Action/Validation Failure
      if (actionResult.success === false) {
        const errorText = actionResult.text || "Invalid input. Please try again.";
        return await this.sendResponse(session, customer, businessId, errorText, currentStep);
      }

      // 6. Template & Response Generation
      const nextStep = actionResult.nextStep || matchedFlow.nextStep || currentStep;
      const rawResponse = actionResult.text || matchedFlow.responseTemplate || "Thank you!";
      
      const interpolatedResponse = actionHandler.interpolate(rawResponse, {
        ...(session.context || {}),
        ...(session.collectedData || {}),
        name: customer.name || 'Friend'
      });

      const response = await this.sendResponse(
        session, 
        customer, 
        businessId, 
        interpolatedResponse, 
        nextStep, 
        actionResult.products, 
        actionResult.awaitingField
      );

      logger.info(`[ChatbotEngine] Execution finished in ${Date.now() - startTime}ms`);
      return response;

    } catch (error) {
      logger.error("[ChatbotEngine] Critical Execution Error:", error);
      return { text: "We are currently experiencing technical difficulties. Please try again later.", nextStep: "start" };
    }
  }

  /**
   * Finalize turn and send response via TemplateEngine
   */
  async sendResponse(session, customer, businessId, text, nextStep, products = [], awaitingField = null) {
    // Determine if we need a template (24h rule)
    const { type, content, templateName, isOutsideWindow } = await templateEngine.getResponse(session, text);

    // Update Session State
    await sessionManager.updateSession(session, {
      currentStep: isOutsideWindow ? 'start' : nextStep, // Reset if outside window to re-start flow
      awaitingField: awaitingField || null,
      lastInteractionAt: new Date()
    });

    // Save Outgoing Message
    const savedMessage = await Message.create({
      customerId: customer._id,
      businessId,
      tenantId: businessId,
      message: content,
      type: 'outgoing',
      senderType: 'chatbot',
      products: products || [],
      metadata: { templateName, isOutsideWindow }
    });

    // Sync with Conversation Tracker
    await conversationTracker.addMessage(businessId, session.phone, 'bot', content, {
      customerId: customer._id,
    });

    return {
      response: content,
      text: content,
      type,
      templateName,
      products,
      nextStep,
      isOutsideWindow
    };
  }

  async handleFallback(session, customer, businessId) {
    const fallbackText = "I'm sorry, I didn't quite catch that. Could you please rephrase or type 'menu' to see options?";
    return await this.sendResponse(session, customer, businessId, fallbackText, session.currentStep);
  }

  // Alias for backward compatibility
  async chatbotEngine(params) {
    return this.processMessage(params);
  }
}

export default new ChatbotEngine();
