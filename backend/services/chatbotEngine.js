import Flow from '../models/Flow.js';
import ChatSession from '../models/ChatSession.js';
import actionHandler from './actionHandler.js';
import chatService from './chatService.js';
import customerService from './customerService.js';
import messageService from './messageService.js';
import messageTemplateService from './messageTemplateService.js';
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

  async findTriggerMatchedFlow({ businessId, userInput, currentStep }) {
    const normalizedInput = String(userInput || '').trim().toLowerCase();
    const normalizedStep = this.normalizeStep(currentStep);

    let matchedFlow = await Flow.findOne({
      businessId,
      step: normalizedStep,
      trigger: normalizedInput,
    }).sort({ order: 1, createdAt: 1 });

    if (!matchedFlow) {
      matchedFlow = await Flow.findOne({
        businessId,
        trigger: normalizedInput,
      }).sort({ order: 1, createdAt: 1 });
    }

    return matchedFlow;
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
        session.context = {
          ...(session.context || {}),
          selectedProduct: product.name,
          selectedProductId: String(product.id || product._id || ''),
        };
        session.markModified('context');
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

    let matchedFlow = await Flow.findOne({
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

    if (!matchedFlow) {
      matchedFlow = await Flow.findOne({
        businessId,
        step: '*',
        trigger: normalizedInput,
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
    const normalizedPhone = String(phone || '').trim();
    const resolvedBusinessId = businessId?._id || businessId;

    await ChatSession.findOneAndUpdate(
      { phone: normalizedPhone, tenantId: resolvedBusinessId },
      {
        $set: {
          phone: normalizedPhone,
          businessId: resolvedBusinessId,
          tenantId: resolvedBusinessId,
          customerId: customer._id,
          currentStep: session.currentStep,
          context: session.context || {},
          collectedData: {
            ...(session.context || {}),
          },
          lastInteractionAt: new Date(),
          mode: 'BOT',
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
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
  }) {
    console.log('FLOW:', matchedFlow.step);
    console.log('FLOW TYPE:', matchedFlow.responseType);
    console.log('TEMPLATE USED:', matchedFlow.templateName);

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

    if (responseType === 'TEXT' || !resolvedTemplateName) {
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

    const templateVariables = messageTemplateService.resolveTemplateData(
      resolvedVariableMapping,
      {
        customer: customer?.toObject ? customer.toObject() : customer,
        context: session.context || {},
        session: session.context || {},
        actionData: {
          ...(actionResult.data || {}),
          ...actionResult,
        },
        business: business?.toObject ? business.toObject() : business,
      }
    );

    const resolvedTemplate = await messageTemplateService.findTemplate({
      businessId,
      templateName: resolvedTemplateName,
      planName: plan,
      enforceAccess: true,
    });

    if (!resolvedTemplate) {
      throw new Error(`Template "${resolvedTemplateName}" not found`);
    }

    const renderedMessage = messageTemplateService.renderTemplate(
      resolvedTemplate,
      templateVariables
    );

    return messageService.sendMessage({
      type: 'TEMPLATE',
      to: phone,
      templateName: resolvedTemplateName,
      variables: templateVariables,
      resolvedTemplate,
      renderedContent: renderedMessage,
      businessId,
      customer,
      phone,
      planName: plan,
      products: actionResult.data?.products || [],
    });
  }

  async handleRestartMessage({
    userInput,
    session,
    customer,
    business,
    businessId,
    phone,
    plan,
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

      if (this.shouldRestartSession(userInput)) {
        const restartResponse = await this.handleRestartMessage({
          userInput,
          session,
          customer,
          business,
          businessId,
          phone: normalizedPhone,
          plan,
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

      const triggerMatchedFlow = await this.findTriggerMatchedFlow({
        businessId,
        userInput: effectiveUserInput,
        currentStep: session.currentStep,
      });

      if (triggerMatchedFlow?.step) {
        session.currentStep = this.normalizeStep(triggerMatchedFlow.step);
      }

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
