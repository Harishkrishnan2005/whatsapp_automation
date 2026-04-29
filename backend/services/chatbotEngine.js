import Flow from '../models/Flow.js';
import actionHandler from './actionHandler.js';
import chatService from './chatService.js';
import customerService from './customerService.js';
import messageService from './messageService.js';
import chatSessionService from './chatSessionService.js';
import templateEngine from './templateEngine.js';
import SessionService from './sessionService.js';
import logger from '../utils/logger.js';
import { checkPlanLimits } from '../utils/featureGuard.js';
import { resolveFlowTemplateConfig } from '../utils/flowTemplateConfig.js';
import Usage from '../models/Usage.js';
import Business from '../models/Business.js';

class ChatbotEngine {
  restartKeywords = new Set(['hi', 'hello', 'start', 'menu']);

  isTextInputValid({ phone, message, businessId }) {
    return Boolean(String(phone || '').trim() && String(message || '').trim() && businessId);
  }

  shouldRestartSession(message = '') {
    return this.restartKeywords.has(String(message || '').trim().toLowerCase());
  }

  normalizeStep(step = 'START') {
    return String(step || 'START').trim().toUpperCase();
  }

  normalizeCategory(business = {}) {
    const rawCategory = business?.category || business?.business_type || business?.businessType || 'ecommerce';
    const normalized = String(rawCategory).trim().toLowerCase();
    if (normalized === 'booking') {
      return 'booking';
    }
    return 'ecommerce';
  }

  buildSyntheticFlow(step) {
    const normalizedStep = this.normalizeStep(step);
    const syntheticFlows = {
      ASK_PRODUCT_NAME: {
        step: 'ASK_PRODUCT_NAME',
        trigger: ['*'],
        reply: 'How many units do you want?',
        action: 'SELECT_PRODUCT',
        nextStep: 'ASK_QUANTITY',
        order: 999,
      },
      ASK_QUANTITY: {
        step: 'ASK_QUANTITY',
        trigger: ['*'],
        reply: 'Type "confirm" to place your order.',
        action: 'SAVE_QUANTITY',
        nextStep: 'CONFIRM_PRODUCT',
        order: 1000,
      },
      CONFIRM_PRODUCT: {
        step: 'CONFIRM_PRODUCT',
        trigger: ['confirm', 'yes', 'checkout', 'place order', 'order'],
        reply: 'Creating your order...',
        action: 'CREATE_ORDER',
        nextStep: 'ORDER_CONFIRM',
        order: 1001,
      },
    };

    const flow = syntheticFlows[normalizedStep];
    return flow ? resolveFlowTemplateConfig(flow) : null;
  }


  interpretStepInput({ message, session }) {
    const normalizedStep = this.normalizeStep(session.currentStep);
    const rawMessage = String(message || '').trim();

    if (normalizedStep !== 'ASK_PRODUCT_NAME') {
      return { handled: false, effectiveUserInput: rawMessage };
    }

    const products = Array.isArray(session?.context?.products)
      ? session.context.products
      : [];
    const numericInput = Number.parseInt(rawMessage, 10);

    if (!Number.isNaN(numericInput)) {
      const product = products[numericInput - 1];
      if (product) {
        console.log('[ChatbotEngine] Interpreted product selection:', product.name);
        console.log('[ChatbotEngine] Session context before update:', JSON.stringify(session.context, null, 2));
        session.context = {
          ...(session.context || {}),
          selectedProduct: product.name,
          selectedProductId: String(product.id || product._id || ''),
        };
        session.markModified('context');
        console.log('[ChatbotEngine] Session context after update:', JSON.stringify(session.context, null, 2));
        return {
          handled: true,
          effectiveUserInput: product.name,
        };
      }
    }

    return {
      handled: false,
      effectiveUserInput: rawMessage,
    };
  }

  resolveNextStep({ session, matchedFlow, actionResult }) {
    const currentStep = this.normalizeStep(session.currentStep);
    const configuredNextStep = this.normalizeStep(matchedFlow?.nextStep || '');
    const actionNextStep = this.normalizeStep(actionResult?.nextStep || '');
    const antiLoopFallbacks = {
      SHOW_PRODUCTS: 'ASK_PRODUCT_NAME',
      ASK_PRODUCT_NAME: 'ASK_QUANTITY',
      GET_QUANTITY: 'CONFIRM_PRODUCT',
      ASK_QUANTITY: 'CONFIRM_PRODUCT',
      CONFIRM_PRODUCT: 'ORDER_CONFIRM',
    };

    let nextStep = configuredNextStep || actionNextStep || currentStep;

    if (nextStep === currentStep && antiLoopFallbacks[currentStep]) {
      nextStep = antiLoopFallbacks[currentStep];
    }

    return this.normalizeStep(nextStep || currentStep);
  }

  async findFlowForStep({ businessId, currentStep, userInput }) {
    const normalizedStep = this.normalizeStep(currentStep);
    const normalizedInput = String(userInput || '').trim().toLowerCase();

    let matchedFlow = null;

    if (normalizedStep === 'START') {
      matchedFlow = await Flow.findOne({
        businessId,
        step: normalizedStep,
        trigger: normalizedInput,
      }).sort({ order: 1, createdAt: 1 });

      if (!matchedFlow) {
        matchedFlow = await Flow.findOne({
          businessId,
          step: normalizedStep,
          trigger: '*',
        }).sort({ order: 1, createdAt: 1 });
      }
    } else {
      matchedFlow = await Flow.findOne({
        businessId,
        step: normalizedStep,
      }).sort({ order: 1, createdAt: 1 });
    }

    if (!matchedFlow) {
      matchedFlow = this.buildSyntheticFlow(normalizedStep);
    }

    return matchedFlow;
  }

  applyCustomerDataToSession(session, customer) {
    const nextContext = {
      ...(session.context || {}),
    };

    if (customer?.name && !nextContext.name) nextContext.name = customer.name;
    if (customer?.age && !nextContext.age) nextContext.age = customer.age;
    if (customer?.address && !nextContext.address) nextContext.address = customer.address;
    if (customer?.phone && !nextContext.phone) nextContext.phone = customer.phone;

    session.context = nextContext;
    session.markModified('context');
  }

  async syncLegacyChatSession(phone, businessId, customer, session) {
    const chatSession = await chatSessionService.getOrCreateChatSession({
      phone,
      businessId,
      customerId: customer?._id || null,
      currentStep: session.currentStep,
    });

    await chatSessionService.syncFlowState(chatSession, {
      phone,
      customerId: customer?._id || null,
      currentStep: session.currentStep,
      currentNode: session.currentStep,
      context: session.context || {},
      collectedData: {
        ...(session.context || {}),
      },
      mode: 'BOT',
    });
  }

  async handleAddressReuseChoice({ userInput, customer, session }) {
    const normalizedInput = String(userInput || '').trim().toLowerCase();
    const usePrevious = new Set(['1', 'use previous', 'previous', 'same', 'old']);
    const useNew = new Set(['2', 'new', 'enter new', 'change']);

    if (usePrevious.has(normalizedInput)) {
      session.context = {
        ...(session.context || {}),
        address: customer.address,
        pendingAddressChoice: false,
        awaitingNewAddress: false,
      };
      session.markModified('context');
      return {
        handled: false,
        overrideInput: customer.address,
      };
    }

    if (useNew.has(normalizedInput)) {
      session.context = {
        ...(session.context || {}),
        pendingAddressChoice: false,
        awaitingNewAddress: true,
      };
      session.markModified('context');
      return {
        handled: true,
        reply: 'Please enter your new address.',
        stayOnStep: true,
      };
    }

    return {
      handled: true,
      reply: 'Please reply with "1" to use your previous address or "2" to enter a new one.',
      stayOnStep: true,
    };
  }

  async maybePromptForReusableData({ customer, matchedFlow, session, replyText }) {
    if (matchedFlow?.nextStep?.toLowerCase().includes('address') && customer?.address) {
      session.context = {
        ...(session.context || {}),
        pendingAddressChoice: true,
        awaitingNewAddress: false,
      };
      session.markModified('context');
      return `${replyText}\n\nUse previous address or new?\n1. Use previous address\n2. Enter new address`;
    }

    return replyText;
  }

  async sendOutgoingMessage({
    matchedFlow,
    actionResult,
    businessId,
    business,
    customer,
    phone,
    plan,
    session,
    chatSessionState,
  }) {
    const responseType = String(matchedFlow.responseType || 'TEXT').toUpperCase();
    const normalizedStep = this.normalizeStep(matchedFlow.step);
    const resolvedTemplateName = normalizedStep === 'START' &&
      String(matchedFlow.templateName || '').toUpperCase() === 'SUPPORT_FOLLOWUP'
      ? 'GREETING'
      : matchedFlow.templateName;
    const resolvedVariableMapping = normalizedStep === 'START' &&
      String(matchedFlow.templateName || '').toUpperCase() === 'SUPPORT_FOLLOWUP'
      ? { name: 'customer.name' }
      : matchedFlow.variableMapping;

    logger.info('[ChatbotEngine] Outgoing message decision', {
      businessId: String(businessId || ''),
      step: matchedFlow.step,
      responseType,
      templateName: resolvedTemplateName || null,
      sessionActive: Boolean(chatSessionState?.sessionActive),
    });

    if (responseType === 'TEXT' || !resolvedTemplateName) {
      if (!chatSessionState?.sessionActive) {
        logger.warn('[ChatbotEngine] Blocking plain text outside 24-hour window', {
          businessId: String(businessId || ''),
          step: matchedFlow.step,
          responseType,
          sessionActive: false,
        });

        return messageService.sendMessage({
          type: 'TEXT',
          to: phone,
          content: templateEngine.FALLBACK_MESSAGE,
          businessId,
          customer,
          phone,
          planName: plan,
          products: actionResult.data?.products || [],
        });
      }

      let replyText = actionResult.reply || actionResult.text || matchedFlow.reply;
      replyText = SessionService.interpolateTemplate(replyText, session);
      replyText = await this.maybePromptForReusableData({
        customer,
        matchedFlow,
        session,
        replyText,
      });

      return messageService.sendMessage({
        type: 'TEXT',
        to: phone,
        content: replyText,
        businessId,
        customer,
        phone,
        planName: plan,
        products: actionResult.data?.products || [],
      });
    }

    const templateContext = {
      customer: customer?.toObject ? customer.toObject() : customer,
      context: session.context || {},
      session: {
        ...(session.context || {}),
        currentStep: session.currentStep,
      },
      actionData: {
        ...(actionResult.data || {}),
        ...actionResult,
      },
      business: business?.toObject ? business.toObject() : business,
    };

    const templateMessage = await templateEngine.sendTemplate({
      businessId,
      templateName: resolvedTemplateName,
      variableMapping: resolvedVariableMapping,
      context: templateContext,
      planName: plan,
      customer,
      phone,
      products: actionResult.data?.products || [],
    });

    logger.info('[ChatbotEngine] Template message sent', {
      businessId: String(businessId || ''),
      sessionActive: Boolean(chatSessionState?.sessionActive),
      responseType,
      templateName: templateMessage.templateName || resolvedTemplateName,
      mappedVariables: templateMessage.mappedVariables || {},
    });

    return templateMessage;
  }

  async handleRestartMessage({
    userInput,
    session,
    customer,
    business,
    businessId,
    phone,
    plan,
    chatSessionState,
  }) {
    const normalizedCategory = this.normalizeCategory(business);

    if (!customer?.name) {
      const startFlow = await Flow.findOne({
        businessId,
        step: 'START',
        trigger: userInput.toLowerCase(),
      }).sort({ order: 1, createdAt: 1 });

      if (!startFlow) {
        return null;
      }

      session.currentStep = this.normalizeStep(startFlow.nextStep || 'ASK_NAME');
      await session.save();
      await this.syncLegacyChatSession(phone, businessId, customer, session);

      const outgoingMessage = await this.sendOutgoingMessage({
        matchedFlow: startFlow,
        actionResult: { success: true },
        businessId,
        business,
        customer,
        phone,
        plan,
        session,
        chatSessionState,
      });

      return {
        text: outgoingMessage.text,
        response: outgoingMessage.response,
        nextStep: session.currentStep,
        type: outgoingMessage.type,
        messageType: outgoingMessage.messageType,
        templateName: outgoingMessage.templateName,
        products: [],
        payment: null,
      };
    }

    if (!customer?.age) {
      const agePromptFlow = await Flow.findOne({
        businessId,
        step: 'ASK_NAME',
      }).sort({ order: 1, createdAt: 1 });

      const replyText = agePromptFlow?.reply || 'Please enter your age.';
      session.currentStep = 'ASK_AGE';
      await session.save();
      await this.syncLegacyChatSession(phone, businessId, customer, session);

      const outgoingMessage = await messageService.sendMessage({
        type: 'TEXT',
        to: phone,
        content: replyText,
        businessId,
        customer,
        phone,
        planName: plan,
      });

      return {
        text: outgoingMessage.text,
        response: outgoingMessage.response,
        nextStep: session.currentStep,
        type: outgoingMessage.type,
        messageType: outgoingMessage.messageType,
        templateName: outgoingMessage.templateName,
        products: [],
        payment: null,
      };
    }

    const actionName = normalizedCategory === 'booking' ? 'SHOW_SERVICES' : 'SHOW_PRODUCTS';
    const nextStep = normalizedCategory === 'booking' ? 'SELECT_SERVICE' : 'ASK_PRODUCT_NAME';
    const actionResult = await actionHandler.executeAction(actionName, {
      userInput,
      session,
      businessId,
      customer,
    });

    session.currentStep = nextStep;
    await session.save();
    await this.syncLegacyChatSession(phone, businessId, customer, session);

    const outgoingMessage = await messageService.sendMessage({
      type: 'TEXT',
      to: phone,
      content: actionResult.reply || actionResult.text || '',
      businessId,
      customer,
      phone,
      planName: plan,
      products: actionResult.products || actionResult.data?.products || [],
    });

    return {
      text: outgoingMessage.text,
      response: outgoingMessage.response,
      nextStep: session.currentStep,
      type: outgoingMessage.type,
      messageType: outgoingMessage.messageType,
      templateName: outgoingMessage.templateName,
      products: actionResult.products || actionResult.data?.products || [],
      payment: actionResult.payment || null,
    };
  }

  async processMessage({ message, phone, businessId }) {
    try {
      const normalizedPhone = String(phone || '').trim();
      const userInput = String(message || '').trim();
      console.log('USER MESSAGE:', userInput);
      console.log('USER INPUT:', userInput);

      if (!this.isTextInputValid({ phone: normalizedPhone, message: userInput, businessId })) {
        return { text: 'Invalid input. phone, message, and businessId are required.', type: 'text' };
      }

      logger.info(`[ChatbotEngine] Processing message: "${userInput}" from ${normalizedPhone}`);

      const { canSendMessage, plan } = await checkPlanLimits(businessId);
      if (!(await canSendMessage())) {
        logger.warn(`[ChatbotEngine] Message limit reached for business: ${businessId} (${plan})`);
        return { text: 'Monthly message limit reached. Please upgrade your plan to continue.', type: 'text' };
      }

      const customer = await customerService.getOrCreateCustomerByPhone(normalizedPhone, businessId, {
        name: 'Guest',
        status: 'new',
      });
      const business = await Business.findById(businessId).select('name category business_type businessType').lean();
      const chatSession = await chatSessionService.getOrCreateChatSession({
        phone: normalizedPhone,
        businessId,
        customerId: customer._id,
      });
      const sessionWindowBeforeMessage = chatSessionService.getWindowState(chatSession);

      logger.info('[ChatbotEngine] Session window before processing', {
        businessId: String(businessId || ''),
        phone: normalizedPhone,
        sessionActive: sessionWindowBeforeMessage.sessionActive,
        lastMessageAt: sessionWindowBeforeMessage.lastMessageAt,
      });

      await customerService.touchCustomer(customer);

      const session = await SessionService.getSessionSafe(normalizedPhone, businessId, customer);
      session.currentStep = this.normalizeStep(session.currentStep);
      this.applyCustomerDataToSession(session, customer);
      session.lastMessage = userInput;

      if (this.shouldRestartSession(userInput)) {
        session.currentStep = 'START';
        session.context = {};
        session.lastMessage = '';
        session.markModified('context');
      }

      console.log('CURRENT STEP:', session.currentStep);

      await chatService.saveCustomerTurn({
        businessId,
        customer,
        phone: normalizedPhone,
        content: userInput,
        type: 'incoming',
        senderType: 'customer',
      });
      await chatSessionService.markIncomingCustomerMessage(chatSession);
      const sessionWindow = chatSessionService.getWindowState(chatSession);

      logger.info('[ChatbotEngine] Session window after inbound customer message', {
        businessId: String(businessId || ''),
        phone: normalizedPhone,
        sessionActive: sessionWindow.sessionActive,
        lastMessageAt: sessionWindow.lastMessageAt,
      });

      if (this.shouldRestartSession(userInput)) {
        const restartResponse = await this.handleRestartMessage({
          userInput,
          session,
          customer,
          business,
          businessId,
          phone: normalizedPhone,
          plan,
          chatSessionState: sessionWindow,
        });

        if (restartResponse) {
          return {
            ...restartResponse,
            customer: {
              id: customer._id,
              name: customer.name,
              phone: customer.phone,
              age: customer.age,
              address: customer.address,
            },
            session: {
              id: session._id,
              currentStep: session.currentStep,
              context: session.context,
              contextKeys: Object.keys(session.context || {}),
              sessionActive: sessionWindow.sessionActive,
            },
          };
        }
      }

      let effectiveUserInput = userInput;

      if (session.context?.pendingAddressChoice) {
        const addressChoice = await this.handleAddressReuseChoice({ userInput, customer, session });
        if (addressChoice.overrideInput) {
          effectiveUserInput = addressChoice.overrideInput;
        } else if (addressChoice.handled) {
          if (!addressChoice.stayOnStep) {
            session.currentStep = session.currentStep;
          }
          await session.save();
          await this.syncLegacyChatSession(normalizedPhone, businessId, customer, session);
          const outgoingMessage = await messageService.sendMessage({
            type: 'TEXT',
            to: normalizedPhone,
            content: addressChoice.reply,
            businessId,
            customer,
            phone: normalizedPhone,
            planName: plan,
          });
          return {
            text: outgoingMessage.text,
            response: outgoingMessage.response,
            nextStep: session.currentStep,
            type: outgoingMessage.type,
            messageType: outgoingMessage.messageType,
            templateName: outgoingMessage.templateName,
          };
        }
      }

      if (session.context?.awaitingNewAddress) {
        session.context = {
          ...(session.context || {}),
          awaitingNewAddress: false,
        };
        session.markModified('context');
      }

      const interpretedInput = this.interpretStepInput({
        message: effectiveUserInput,
        session,
      });
      effectiveUserInput = interpretedInput.effectiveUserInput;

      const matchedFlow = await this.findFlowForStep({
        businessId,
        currentStep: session.currentStep,
        userInput: effectiveUserInput,
      });

      if (!matchedFlow) {
        logger.warn(`[ChatbotEngine] No matching flow for "${userInput}" at step "${session.currentStep}"`);
        const fallbackReply = "I'm sorry, I didn't understand that. Type 'hi' to start over.";
        await session.save();
        await this.syncLegacyChatSession(normalizedPhone, businessId, customer, session);
        const outgoingMessage = await messageService.sendMessage({
          type: 'TEXT',
          to: normalizedPhone,
          content: fallbackReply,
          businessId,
          customer,
          phone: normalizedPhone,
          planName: plan,
        });
        return {
          text: outgoingMessage.text,
          response: outgoingMessage.response,
          type: outgoingMessage.type,
          messageType: outgoingMessage.messageType,
          templateName: outgoingMessage.templateName,
          nextStep: session.currentStep,
        };
      }

      let actionResult = { success: true };
      if (matchedFlow.action && matchedFlow.action !== 'NONE') {
        actionResult = await actionHandler.executeAction(matchedFlow.action, {
          userInput: effectiveUserInput,
          session,
          businessId,
          customer,
        });
      }

      if (actionResult.success === false) {
        const errorReply = actionResult.reply || actionResult.text || 'Please try again.';
        await session.save();
        await this.syncLegacyChatSession(normalizedPhone, businessId, customer, session);
        const outgoingMessage = await messageService.sendMessage({
          type: 'TEXT',
          to: normalizedPhone,
          content: errorReply,
          businessId,
          customer,
          phone: normalizedPhone,
          planName: plan,
        });
        return {
          text: outgoingMessage.text,
          response: outgoingMessage.response,
          nextStep: session.currentStep,
          type: outgoingMessage.type,
          messageType: outgoingMessage.messageType,
          templateName: outgoingMessage.templateName,
        };
      }

      const configuredNextStep = this.normalizeStep(matchedFlow.nextStep || '');
      session.currentStep = this.resolveNextStep({
        session,
        matchedFlow,
        actionResult,
      });
      console.log('NEXT STEP:', configuredNextStep || session.currentStep);
      this.applyCustomerDataToSession(session, customer);

      await session.save();
      await this.syncLegacyChatSession(normalizedPhone, businessId, customer, session);
      const outgoingMessage = await this.sendOutgoingMessage({
        matchedFlow,
        actionResult,
        businessId,
        business,
        customer,
        phone: normalizedPhone,
        plan,
        session,
        chatSessionState: sessionWindow,
      });

      await Usage.findOneAndUpdate(
        { businessId },
        { $inc: { messagesUsed: 1 } },
        { upsert: true }
      );

      return {
        text: outgoingMessage.text,
        response: outgoingMessage.response,
        nextStep: session.currentStep,
        data: actionResult.data || {},
        products: actionResult.products || actionResult.data?.products || [],
        payment: actionResult.payment || null,
        customer: {
          id: customer._id,
          name: customer.name,
          phone: customer.phone,
          age: customer.age,
          address: customer.address,
        },
        session: {
          id: session._id,
          currentStep: session.currentStep,
          context: session.context,
          contextKeys: Object.keys(session.context || {}),
          sessionActive: sessionWindow.sessionActive,
        },
        type: outgoingMessage.type,
        messageType: outgoingMessage.messageType,
        templateName: outgoingMessage.templateName,
      };
    } catch (error) {
      logger.error('[ChatbotEngine] Error:', error);
      return { text: 'Oops! Something went wrong. Please try again later.', type: 'text' };
    }
  }

  async chatbotEngine(params) {
    return this.processMessage(params);
  }
}

export default new ChatbotEngine();
