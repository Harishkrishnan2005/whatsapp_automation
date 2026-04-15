import ChatbotFlow from '../models/ChatbotFlow.js';
import Customer from '../models/Customer.js';
import SessionService from './sessionService.js';
import ActionHandler from './actionHandler.js';

const normalizeMessage = (message) => String(message || '').toLowerCase().trim();
const squeezeSpaces = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

class ChatbotEngine {
  static GLOBAL_COMMANDS = {
    WELCOME: ['hi', 'hello', 'hey', 'start'],
    RESTART: ['restart', 'reset', 'begin again', 'new chat'],
    MENU: ['menu', 'options', 'help', 'back to menu'],
  };

  async ensureCustomer(phone, businessId) {
    let customer = await Customer.findOne({ phone, businessId });
    if (!customer) {
      customer = await Customer.create({
        phone,
        businessId,
        name: '',
      });
    }
    return customer;
  }

  interpolate(text, vars = {}) {
    let output = String(text || '');
    for (const [key, value] of Object.entries(vars)) {
      output = output.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), String(value ?? ''));
    }
    return output;
  }

  async getSystemReply(businessId, trigger, fallback, vars = {}) {
    const flow = await ChatbotFlow.findOne({
      businessId,
      step: 'system',
      trigger,
      isActive: true,
    }).lean();

    return this.interpolate(flow?.reply || fallback, vars);
  }

  getCustomerName(session, customer) {
    const sessionName = String(session?.context?.name || '').trim();
    const customerName = String(customer?.name || '').trim();
    return sessionName || customerName || '';
  }

  async getMenuText(businessId, customerName = '') {
    const configuredMenu = await this.getSystemReply(
      businessId,
      'menu',
      'Menu Options:\n1. View products\n2. Order product\n3. Appointment booking\n4. Return product\n5. Cancel product\n6. Feedback\n7. Support\n\nType your choice or go back to continue.'
    );
    const baseMenu = configuredMenu.includes('Cancel product') && configuredMenu.includes('Support')
      ? configuredMenu
      : 'Menu Options:\n1. View products\n2. Order product\n3. Appointment booking\n4. Return product\n5. Cancel product\n6. Feedback\n7. Support\n\nType your choice or go back to continue.';
    if (!customerName) return baseMenu;
    return `Hi ${customerName},\n\n${baseMenu}`;
  }

  isProfileIncomplete(customer) {
    if (!customer) return true;
    const name = String(customer.name || '').trim();
    const age = Number(customer.age);
    return !name || !Number.isInteger(age) || age < 1 || age > 120;
  }

  async getProfilePrompt(businessId, step, customerName = '') {
    if (step === 'ask_age') {
      return this.getSystemReply(
        businessId,
        'ask_age_prompt',
        `Thanks ${customerName || 'there'}. Please share your age.`
      );
    }
    return this.getSystemReply(
      businessId,
      'ask_name_prompt',
      'Welcome. Please share your name to continue.'
    );
  }

  getGlobalCommandType(normalizedMessage) {
    if (ChatbotEngine.GLOBAL_COMMANDS.WELCOME.includes(normalizedMessage)) return 'WELCOME';
    if (ChatbotEngine.GLOBAL_COMMANDS.RESTART.includes(normalizedMessage)) return 'RESTART';
    if (ChatbotEngine.GLOBAL_COMMANDS.MENU.includes(normalizedMessage)) return 'MENU';
    return null;
  }

  async handleGlobalCommand(commandType, session, businessId, customerName = '') {
    switch (commandType) {
      case 'WELCOME':
      case 'RESTART':
        await SessionService.resetSession(session);
        await SessionService.updateSession(session, { step: 'menu' });
        return {
          response: await this.getMenuText(businessId, customerName),
          text: await this.getMenuText(businessId, customerName),
          products: [],
          type: 'text',
        };
      case 'MENU':
        await SessionService.updateSession(session, { step: 'menu' });
        return {
          response: await this.getMenuText(businessId, customerName),
          text: await this.getMenuText(businessId, customerName),
          products: [],
          type: 'text',
        };
      default:
        return null;
    }
  }

  async invalidOptionResponse(businessId = null) {
    const fallback = "Invalid option. Type 'menu' to see all options.";
    const reply = businessId
      ? await this.getSystemReply(businessId, 'invalid_option', fallback)
      : fallback;

    return {
      response: reply,
      text: reply,
      products: [],
      type: 'text',
    };
  }

  normalizeStepTrigger(step, normalizedMessage) {
    const msg = squeezeSpaces(normalizedMessage);
    if (!msg) return msg;

    if (step === 'menu') {
      if (['1', 'view products', 'show products', 'products', 'product list'].includes(msg)) return '1';
      if (['2', 'order product', 'buy product', 'place order', 'order'].includes(msg)) return '2';
      if (['3', 'appointment booking', 'appointment', 'book appointment', 'book slot'].includes(msg)) return '3';
      if (['4', 'return product', 'return', 'return order'].includes(msg)) return '4';
      if (['5', 'cancel product', 'cancel order', 'cancel', 'order cancel'].includes(msg)) return '5';
      if (['6', 'feedback', 'query', 'support query', 'new query'].includes(msg)) return '6';
      if (['7', 'support', 'help', 'customer support', 'support request'].includes(msg)) return '7';
    }

    if (step === 'confirm_saved_address') {
      if (['yes', 'y', 'continue', 'use this', 'same', 'old', '1'].includes(msg)) return 'continue';
      if (['new', 'change', 'new address', '2'].includes(msg)) return 'new';
    }

    if (step === 'select_payment') {
      if (['1', 'online', 'online payment', 'upi'].includes(msg)) return 'online';
      if (['2', 'cash', 'cash on delivery', 'cod'].includes(msg)) return 'cod';
    }

    if (step === 'confirm_refund_upi') {
      if (['yes', 'y', 'use this', 'continue', 'ok', '1'].includes(msg)) return 'yes';
      if (['no', 'n', 'new', 'change', 'new upi', '2'].includes(msg)) return 'new';
    }

    return msg;
  }

  isValidUpiId(value) {
    return /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/.test(String(value || '').trim());
  }

  async buildPaymentSummary(preview, businessId) {
    const subtotalMrp = preview.mrp * preview.quantity;
    const discountedSubtotal = preview.offerPrice * preview.quantity;
    const paymentOptions = preview.finalPrice > 10000
      ? 'Orders above Rs 10,000 require online payment.\nPlease choose:\n1. Online payment'
      : 'Choose payment method:\n1. Online payment\n2. Cash on delivery';

    return await this.getSystemReply(
      businessId,
      'payment_summary',
      [
        'Order Summary:',
        '{{productName}} x {{quantity}}',
        'MRP: Rs {{mrp}}',
        'Offer Price: Rs {{offerPrice}}',
        'Discount: {{discountPercent}}%',
        'Subtotal (MRP x Qty): Rs {{subtotalMrp}}',
        'Discounted Total: Rs {{discountedSubtotal}}',
        'Coupon Discount: Rs {{couponDiscount}}',
        'Final Price: Rs {{finalPrice}}',
        '',
        '{{paymentOptions}}',
        '',
        'Reply with 1/2 or online/cash.',
      ].join('\n'),
      {
        productName: preview.product.name,
        quantity: preview.quantity,
        mrp: preview.mrp.toFixed(2),
        offerPrice: preview.offerPrice.toFixed(2),
        discountPercent: preview.offerPercentage.toFixed(2),
        subtotalMrp: subtotalMrp.toFixed(2),
        discountedSubtotal: discountedSubtotal.toFixed(2),
        couponDiscount: preview.couponDiscount.toFixed(2),
        finalPrice: preview.finalPrice.toFixed(2),
        paymentOptions,
      }
    );
  }

  async startProductCheckout({ session, businessId, message, actionResult, customer }) {
    if (actionResult?.contextDelta) {
      session.context = { ...session.context, ...actionResult.contextDelta };
    }

    if (customer?.address) {
      await SessionService.updateSession(session, {
        step: 'confirm_saved_address',
        context: {
          ...session.context,
          deliveryAddress: customer.address,
        },
        lastMessage: message,
      });

      const reply = await this.getSystemReply(
        businessId,
        'confirm_saved_address',
        'We found your saved address:\n{{address}}\n\nContinue with this address?\n1. Continue\n2. New address',
        { address: customer.address }
      );

      return { response: reply, text: reply, products: [], type: 'text' };
    }

    await SessionService.updateSession(session, {
      step: 'ask_address',
      context: session.context,
      lastMessage: message,
    });

    const askAddressText = await this.getSystemReply(
      businessId,
      'ask_address',
      'Please share your delivery address.'
    );

    return { response: askAddressText, text: askAddressText, products: [], type: 'text' };
  }

  async chatbotEngine({ phone, message, businessId }) {
    try {
      const msg = normalizeMessage(message);
      if (!phone || !businessId || !msg) {
        return this.invalidOptionResponse(businessId);
      }

      let session = await SessionService.getOrCreateSession(phone, businessId);

      if (SessionService.isSessionExpired(session)) {
        session = await SessionService.handleExpiryReset(session);
      }

      const customer = await this.ensureCustomer(phone, businessId);
      const customerName = this.getCustomerName(session, customer);

      if (this.isProfileIncomplete(customer) && !['ask_name', 'ask_age'].includes(session.step)) {
        const nextProfileStep = customer?.name ? 'ask_age' : 'ask_name';
        await SessionService.updateSession(session, {
          step: nextProfileStep,
          lastMessage: message,
        });

        const prompt = await this.getProfilePrompt(businessId, nextProfileStep, customer?.name);
        return { response: prompt, text: prompt, products: [], type: 'text' };
      }

      if (session.step === 'ask_name') {
        if (this.getGlobalCommandType(msg)) {
          const prompt = await this.getProfilePrompt(businessId, 'ask_name');
          return { response: prompt, text: prompt, products: [], type: 'text' };
        }

        const actionResult = await ActionHandler.executeAction('SAVE_NAME', {
          session,
          businessId,
          phone,
          message,
        });

        if (actionResult.contextDelta) {
          session.context = { ...session.context, ...actionResult.contextDelta };
        }

        session.step = 'ask_age';
        await SessionService.updateSession(session, {
          step: session.step,
          context: session.context,
          lastMessage: message,
        });

        const askAgeText = await this.getProfilePrompt(businessId, 'ask_age', actionResult?.contextDelta?.name);
        return {
          response: `${actionResult.text}\n\n${askAgeText}`,
          text: `${actionResult.text}\n\n${askAgeText}`,
          products: [],
          type: 'text',
        };
      }

      if (session.step === 'ask_age') {
        const parsedAge = Number.parseInt(String(message || '').trim(), 10);
        if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
          const prompt = await this.getSystemReply(
            businessId,
            'ask_age_prompt',
            'Please enter a valid age between 1 and 120.'
          );
          return { response: prompt, text: prompt, products: [], type: 'text' };
        }

        await Customer.findOneAndUpdate(
          { phone, businessId },
          { $set: { age: parsedAge } },
          { new: true }
        );

        await SessionService.updateSession(session, {
          step: 'menu',
          lastMessage: message,
        });

        const updatedCustomer = await Customer.findOne({ phone, businessId }).lean();
        const updatedName = this.getCustomerName(session, updatedCustomer);
        const menuText = await this.getMenuText(businessId, updatedName);
        return {
          response: `Thanks. Your age is saved.\n\n${menuText}`,
          text: `Thanks. Your age is saved.\n\n${menuText}`,
          products: [],
          type: 'text',
        };
      }

      const globalCommandType = this.getGlobalCommandType(msg);
      if (globalCommandType) {
        const commandResponse = await this.handleGlobalCommand(globalCommandType, session, businessId, customerName);
        await SessionService.updateSession(session, { lastMessage: message });
        return commandResponse;
      }

      if (session.step === 'select_product') {
        const actionResult = await ActionHandler.executeAction('SAVE_PRODUCT', {
          session,
          businessId,
          phone,
          message,
        });

        if (!actionResult?.matched) {
          return {
            response: actionResult?.text || 'Product not found. Please enter an exact product name.',
            text: actionResult?.text || 'Product not found. Please enter an exact product name.',
            products: actionResult?.products || [],
            type: actionResult?.type || (actionResult?.products?.length ? 'product' : 'text'),
          };
        }

        return this.startProductCheckout({ session, businessId, message, actionResult, customer });
      }

      if (session.step === 'confirm_saved_address') {
        const choice = this.normalizeStepTrigger('confirm_saved_address', msg);

        if (choice === 'continue') {
          await SessionService.updateSession(session, {
            step: 'ask_quantity',
            lastMessage: message,
          });

          const askQtyText = await this.getSystemReply(
            businessId,
            'ask_quantity',
            'Enter product quantity (numbers only).'
          );
          return { response: askQtyText, text: askQtyText, products: [], type: 'text' };
        }

        if (choice === 'new') {
          await SessionService.updateSession(session, {
            step: 'ask_address',
            lastMessage: message,
          });

          const askAddressText = await this.getSystemReply(
            businessId,
            'ask_address',
            'Please share your new delivery address.'
          );
          return { response: askAddressText, text: askAddressText, products: [], type: 'text' };
        }

        const retryText = await this.getSystemReply(
          businessId,
          'confirm_saved_address',
          'Please reply with Continue or New address.'
        );
        return { response: retryText, text: retryText, products: [], type: 'text' };
      }

      if (session.step === 'ask_address') {
        const deliveryAddress = String(message || '').trim();
        if (deliveryAddress.length < 5) {
          return {
            response: await this.getSystemReply(
              businessId,
              'address_invalid',
              'Please enter a complete delivery address.'
            ),
            text: await this.getSystemReply(
              businessId,
              'address_invalid',
              'Please enter a complete delivery address.'
            ),
            products: [],
            type: 'text',
          };
        }

        await Customer.findOneAndUpdate(
          { phone, businessId },
          { $set: { address: deliveryAddress } },
          { new: true }
        );

        await SessionService.updateSession(session, {
          step: 'ask_quantity',
          context: { deliveryAddress },
          lastMessage: message,
        });

        const askQtyText = await this.getSystemReply(
          businessId,
          'ask_quantity',
          'Enter product quantity (numbers only).'
        );
        return { response: askQtyText, text: askQtyText, products: [], type: 'text' };
      }

      if (session.step === 'ask_quantity') {
        const quantity = Number.parseInt(String(message || '').trim(), 10);
        if (!Number.isInteger(quantity) || quantity <= 0) {
          return {
            response: await this.getSystemReply(
              businessId,
              'quantity_invalid',
              'Please enter a valid quantity (1 or more).'
            ),
            text: await this.getSystemReply(
              businessId,
              'quantity_invalid',
              'Please enter a valid quantity (1 or more).'
            ),
            products: [],
            type: 'text',
          };
        }

        await SessionService.updateSession(session, {
          step: 'ask_coupon',
          context: { quantity },
          lastMessage: message,
        });

        const askCouponText = await this.getSystemReply(
          businessId,
          'ask_coupon',
          'If you have a gift coupon, enter it now. Otherwise type "no".'
        );
        return { response: askCouponText, text: askCouponText, products: [], type: 'text' };
      }

      if (session.step === 'ask_coupon') {
        const couponInput = String(message || '').trim();
        const couponCode = couponInput.toLowerCase() === 'no' ? '' : couponInput.toUpperCase();

        await SessionService.updateSession(session, {
          step: 'select_payment',
          context: { couponCode },
          lastMessage: message,
        });

        const updatedSession = await SessionService.getOrCreateSession(phone, businessId);
        const preview = await ActionHandler.getOrderPricingPreview({
          session: updatedSession,
          businessId,
        });

        if (!preview) {
          const summaryErrorText = await this.getSystemReply(
            businessId,
            'payment_summary_error',
            'Unable to prepare payment summary. Please choose product again.'
          );
          return {
            response: summaryErrorText,
            text: summaryErrorText,
            products: [],
            type: 'text',
          };
        }

        const paymentText = await this.buildPaymentSummary(preview, businessId);
        return { response: paymentText, text: paymentText, products: [], type: 'text' };
      }

      if (session.step === 'select_payment') {
        const paymentChoice = this.normalizeStepTrigger('select_payment', msg);
        if (!['online', 'cod'].includes(paymentChoice)) {
          return {
            response: await this.getSystemReply(
              businessId,
              'payment_method_invalid',
              'Please choose a valid payment method: online payment or cash on delivery.'
            ),
            text: await this.getSystemReply(
              businessId,
              'payment_method_invalid',
              'Please choose a valid payment method: online payment or cash on delivery.'
            ),
            products: [],
            type: 'text',
          };
        }

        const preview = await ActionHandler.getOrderPricingPreview({ session, businessId });
        if (preview?.finalPrice > 10000 && paymentChoice === 'cod') {
          return {
            response: await this.getSystemReply(
              businessId,
              'payment_online_only',
              'Orders above Rs 10,000 require online payment only. Please choose online payment.'
            ),
            text: await this.getSystemReply(
              businessId,
              'payment_online_only',
              'Orders above Rs 10,000 require online payment only. Please choose online payment.'
            ),
            products: [],
            type: 'text',
          };
        }

        const actionResult = await ActionHandler.executeAction('CREATE_ORDER', {
          session,
          businessId,
          phone,
          message,
          paymentType: paymentChoice === 'online' ? 'ONLINE' : 'COD',
        });

        if (actionResult?.success === false) {
          return {
            response: actionResult.text,
            text: actionResult.text,
            products: [],
            type: 'text',
          };
        }

        await SessionService.updateSession(session, {
          step: 'menu',
          context: actionResult?.contextDelta || {},
          lastMessage: message,
        });

        if (actionResult?.type === 'payment') {
          return {
            response: actionResult.text,
            text: actionResult.text,
            products: [],
            type: 'payment',
            payment: actionResult.payment,
          };
        }

        const menuText = await this.getMenuText(businessId, customerName);
        return {
          response: `${actionResult.text}\n\n${menuText}`,
          text: `${actionResult.text}\n\n${menuText}`,
          products: [],
          type: 'text',
        };
      }

      if (session.step === 'ask_cancel_order_id') {
        const extractedOrderId = ActionHandler.extractOrderId(message);
        if (!extractedOrderId) {
          return {
            response: await this.getSystemReply(
              businessId,
              'cancel_order_id_invalid',
              'Please enter a valid order ID to cancel.'
            ),
            text: await this.getSystemReply(
              businessId,
              'cancel_order_id_invalid',
              'Please enter a valid order ID to cancel.'
            ),
            products: [],
            type: 'text',
          };
        }

        await SessionService.updateSession(session, {
          step: 'ask_cancel_reason',
          context: {
            ...session.context,
            pendingCancelOrderId: extractedOrderId,
          },
          lastMessage: message,
        });

        const askCancelReasonText = await this.getSystemReply(
          businessId,
          'ask_cancel_reason',
          'Please share the cancellation reason.'
        );
        return {
          response: askCancelReasonText,
          text: askCancelReasonText,
          products: [],
          type: 'text',
        };
      }

      if (session.step === 'ask_cancel_reason') {
        const cancellationReason = String(message || '').trim();
        if (cancellationReason.length < 2) {
          return {
            response: await this.getSystemReply(
              businessId,
              'cancel_reason_invalid',
              'Please provide a valid cancellation reason.'
            ),
            text: await this.getSystemReply(
              businessId,
              'cancel_reason_invalid',
              'Please provide a valid cancellation reason.'
            ),
            products: [],
            type: 'text',
          };
        }

        const orderId = session?.context?.pendingCancelOrderId;
        const targetOrder = await ActionHandler.findOrderByReference({ businessId, orderId });
        if (!targetOrder) {
          return {
            response: await this.getSystemReply(businessId, 'error_invalid_order_id', 'Invalid order ID.'),
            text: await this.getSystemReply(businessId, 'error_invalid_order_id', 'Invalid order ID.'),
            products: [],
            type: 'text',
          };
        }

        if (String(targetOrder.customerId) !== String(customer?._id)) {
          return {
            response: await this.getSystemReply(
              businessId,
              'cancel_only_own_order',
              'You can cancel only your own ordered product.'
            ),
            text: await this.getSystemReply(
              businessId,
              'cancel_only_own_order',
              'You can cancel only your own ordered product.'
            ),
            products: [],
            type: 'text',
          };
        }

        if (targetOrder.orderStatus === 'Delivered') {
          return {
            response: await this.getSystemReply(
              businessId,
              'cancel_after_delivered_not_allowed',
              'Order is already delivered. You can only return the product.'
            ),
            text: await this.getSystemReply(
              businessId,
              'cancel_after_delivered_not_allowed',
              'Order is already delivered. You can only return the product.'
            ),
            products: [],
            type: 'text',
          };
        }

        if (['Cancelled', 'Returned'].includes(targetOrder.orderStatus)) {
          const terminalText = targetOrder.orderStatus === 'Cancelled'
            ? `Order ${targetOrder.orderId || targetOrder._id} is cancelled.`
            : `Order ${targetOrder.orderId || targetOrder._id} is returned.`;
          return {
            response: terminalText,
            text: terminalText,
            products: [],
            type: 'text',
          };
        }

        if (targetOrder.paymentStatus === 'Paid') {
          const existingUpi = String(customer?.upiId || '').trim();
          if (existingUpi) {
            await SessionService.updateSession(session, {
              step: 'confirm_refund_upi',
              context: {
                ...session.context,
                refundActionType: 'cancel',
                refundOrderId: orderId,
                refundReason: cancellationReason,
                refundUpiId: existingUpi,
              },
              lastMessage: message,
            });

            const confirmText = await this.getSystemReply(
              businessId,
              'confirm_existing_upi',
              'We found your UPI ID: {{upiId}}. Reply Yes to use this, or reply New to share a different UPI ID.',
              { upiId: existingUpi }
            );
            return { response: confirmText, text: confirmText, products: [], type: 'text' };
          }

          await SessionService.updateSession(session, {
            step: 'ask_refund_upi',
            context: {
              ...session.context,
              refundActionType: 'cancel',
              refundOrderId: orderId,
              refundReason: cancellationReason,
            },
            lastMessage: message,
          });

          const askUpiText = await this.getSystemReply(
            businessId,
            'ask_refund_upi',
            'Please share your UPI ID for refund.'
          );
          return { response: askUpiText, text: askUpiText, products: [], type: 'text' };
        }

        const cancelResult = await ActionHandler.executeAction('CANCEL_ORDER', {
          session,
          businessId,
          phone,
          message,
          orderId: session?.context?.pendingCancelOrderId,
          reason: cancellationReason,
        });

        await SessionService.updateSession(session, {
          step: 'menu',
          context: {
            ...session.context,
            pendingCancelOrderId: null,
          },
          lastMessage: message,
        });

        const menuText = await this.getMenuText(businessId, customerName);
        return {
          response: `${cancelResult.text}\n\n${menuText}`,
          text: `${cancelResult.text}\n\n${menuText}`,
          products: [],
          type: 'text',
        };
      }

      if (session.step === 'ask_return_order_id') {
        const extractedOrderId = ActionHandler.extractOrderId(message);
        if (!extractedOrderId) {
          return {
            response: await this.getSystemReply(
              businessId,
              'return_order_id_invalid',
              'Please enter a valid order ID for return.'
            ),
            text: await this.getSystemReply(
              businessId,
              'return_order_id_invalid',
              'Please enter a valid order ID for return.'
            ),
            products: [],
            type: 'text',
          };
        }

        await SessionService.updateSession(session, {
          step: 'ask_return_reason',
          context: {
            ...session.context,
            pendingReturnOrderId: extractedOrderId,
          },
          lastMessage: message,
        });

        const askReturnReasonText = await this.getSystemReply(
          businessId,
          'ask_return_reason',
          'Please share the return reason.'
        );
        return {
          response: askReturnReasonText,
          text: askReturnReasonText,
          products: [],
          type: 'text',
        };
      }

      if (session.step === 'ask_return_reason') {
        const returnReason = String(message || '').trim();
        if (returnReason.length < 2) {
          return {
            response: await this.getSystemReply(
              businessId,
              'return_reason_invalid',
              'Please provide a valid return reason.'
            ),
            text: await this.getSystemReply(
              businessId,
              'return_reason_invalid',
              'Please provide a valid return reason.'
            ),
            products: [],
            type: 'text',
          };
        }

        const orderId = session?.context?.pendingReturnOrderId;
        const targetOrder = await ActionHandler.findOrderByReference({ businessId, orderId });
        if (!targetOrder) {
          return {
            response: await this.getSystemReply(businessId, 'error_invalid_order_id', 'Invalid order ID.'),
            text: await this.getSystemReply(businessId, 'error_invalid_order_id', 'Invalid order ID.'),
            products: [],
            type: 'text',
          };
        }

        if (String(targetOrder.customerId) !== String(customer?._id)) {
          return {
            response: await this.getSystemReply(
              businessId,
              'return_only_own_order',
              'You can return only your own ordered product.'
            ),
            text: await this.getSystemReply(
              businessId,
              'return_only_own_order',
              'You can return only your own ordered product.'
            ),
            products: [],
            type: 'text',
          };
        }

        if (['Cancelled', 'Returned'].includes(targetOrder.orderStatus)) {
          const terminalText = targetOrder.orderStatus === 'Cancelled'
            ? `Order ${targetOrder.orderId || targetOrder._id} is cancelled.`
            : `Order ${targetOrder.orderId || targetOrder._id} is returned.`;
          return {
            response: terminalText,
            text: terminalText,
            products: [],
            type: 'text',
          };
        }

        if (targetOrder.orderStatus !== 'Delivered') {
          const onlyDeliveredText = await this.getSystemReply(
            businessId,
            'return_only_delivered',
            'Only delivered orders can be returned.'
          );
          return { response: onlyDeliveredText, text: onlyDeliveredText, products: [], type: 'text' };
        }

        if (targetOrder.paymentStatus === 'Paid') {
          const existingUpi = String(customer?.upiId || '').trim();
          if (existingUpi) {
            await SessionService.updateSession(session, {
              step: 'confirm_refund_upi',
              context: {
                ...session.context,
                refundActionType: 'return',
                refundOrderId: orderId,
                refundReason: returnReason,
                refundUpiId: existingUpi,
              },
              lastMessage: message,
            });

            const confirmText = await this.getSystemReply(
              businessId,
              'confirm_existing_upi',
              'We found your UPI ID: {{upiId}}. Reply Yes to use this, or reply New to share a different UPI ID.',
              { upiId: existingUpi }
            );
            return { response: confirmText, text: confirmText, products: [], type: 'text' };
          }

          await SessionService.updateSession(session, {
            step: 'ask_refund_upi',
            context: {
              ...session.context,
              refundActionType: 'return',
              refundOrderId: orderId,
              refundReason: returnReason,
            },
            lastMessage: message,
          });

          const askUpiText = await this.getSystemReply(
            businessId,
            'ask_refund_upi',
            'Please share your UPI ID for refund.'
          );
          return { response: askUpiText, text: askUpiText, products: [], type: 'text' };
        }

        const returnResult = await ActionHandler.executeAction('RETURN_ORDER', {
          session,
          businessId,
          phone,
          message,
          orderId: session?.context?.pendingReturnOrderId,
          reason: returnReason,
        });

        await SessionService.updateSession(session, {
          step: 'menu',
          context: {
            ...session.context,
            pendingReturnOrderId: null,
          },
          lastMessage: message,
        });

        const menuText = await this.getMenuText(businessId, customerName);
        return {
          response: `${returnResult.text}\n\n${menuText}`,
          text: `${returnResult.text}\n\n${menuText}`,
          products: [],
          type: 'text',
        };
      }

      if (session.step === 'confirm_refund_upi') {
        const choice = this.normalizeStepTrigger('confirm_refund_upi', msg);
        if (choice === 'new') {
          await SessionService.updateSession(session, {
            step: 'ask_refund_upi',
            context: session.context,
            lastMessage: message,
          });
          const askUpiText = await this.getSystemReply(
            businessId,
            'ask_refund_upi',
            'Please share your UPI ID for refund.'
          );
          return { response: askUpiText, text: askUpiText, products: [], type: 'text' };
        }

        if (choice !== 'yes') {
          const confirmText = await this.getSystemReply(
            businessId,
            'confirm_existing_upi',
            'We found your UPI ID: {{upiId}}. Reply Yes to use this, or reply New to share a different UPI ID.',
            { upiId: session?.context?.refundUpiId || '' }
          );
          return { response: confirmText, text: confirmText, products: [], type: 'text' };
        }

        const actionType = session?.context?.refundActionType;
        const orderId = session?.context?.refundOrderId;
        const reason = session?.context?.refundReason || '';
        const actionName = actionType === 'cancel' ? 'CANCEL_ORDER' : 'RETURN_ORDER';

        const actionResult = await ActionHandler.executeAction(actionName, {
          session,
          businessId,
          phone,
          message,
          orderId,
          reason,
        });

        await SessionService.updateSession(session, {
          step: 'menu',
          context: {
            ...session.context,
            refundActionType: null,
            refundOrderId: null,
            refundReason: null,
            refundUpiId: null,
            pendingCancelOrderId: null,
            pendingReturnOrderId: null,
          },
          lastMessage: message,
        });

        const refundMsg = await this.getSystemReply(
          businessId,
          'refund_credit_24h',
          'Amount will credit within 24hrs.'
        );
        const menuText = await this.getMenuText(businessId, customerName);
        return {
          response: `${actionResult.text}\n${refundMsg}\n\n${menuText}`,
          text: `${actionResult.text}\n${refundMsg}\n\n${menuText}`,
          products: [],
          type: 'text',
        };
      }

      if (session.step === 'ask_refund_upi') {
        const upiId = String(message || '').trim();
        if (!this.isValidUpiId(upiId)) {
          const invalidUpiText = await this.getSystemReply(
            businessId,
            'refund_upi_invalid',
            'Please enter a valid UPI ID (example: name@bank).'
          );
          return { response: invalidUpiText, text: invalidUpiText, products: [], type: 'text' };
        }

        await Customer.findOneAndUpdate(
          { _id: customer._id, businessId },
          { $set: { upiId } },
          { new: true }
        );

        const actionType = session?.context?.refundActionType;
        const orderId = session?.context?.refundOrderId;
        const reason = session?.context?.refundReason || '';
        const actionName = actionType === 'cancel' ? 'CANCEL_ORDER' : 'RETURN_ORDER';

        const actionResult = await ActionHandler.executeAction(actionName, {
          session,
          businessId,
          phone,
          message,
          orderId,
          reason,
        });

        await SessionService.updateSession(session, {
          step: 'menu',
          context: {
            ...session.context,
            refundActionType: null,
            refundOrderId: null,
            refundReason: null,
            refundUpiId: upiId,
            pendingCancelOrderId: null,
            pendingReturnOrderId: null,
          },
          lastMessage: message,
        });

        const refundMsg = await this.getSystemReply(
          businessId,
          'refund_credit_24h',
          'Amount will credit within 24hrs.'
        );
        const menuText = await this.getMenuText(businessId, customerName);
        return {
          response: `${actionResult.text}\n${refundMsg}\n\n${menuText}`,
          text: `${actionResult.text}\n${refundMsg}\n\n${menuText}`,
          products: [],
          type: 'text',
        };
      }

      if (session.step === 'ask_appointment_details') {
        const appointmentResult = await ActionHandler.executeAction('BOOK_APPOINTMENT', {
          session,
          businessId,
          phone,
          message,
        });

        await SessionService.updateSession(session, {
          step: 'menu',
          lastMessage: message,
        });

        const menuText = await this.getMenuText(businessId, customerName);
        return {
          response: `${appointmentResult.text}\n\n${menuText}`,
          text: `${appointmentResult.text}\n\n${menuText}`,
          products: [],
          type: 'text',
        };
      }

      if (session.step === 'ask_feedback_query') {
        const choice = this.normalizeStepTrigger('ask_feedback_query', msg);
        if (choice === 'continue') {
          await SessionService.updateSession(session, {
            step: 'ask_feedback_text',
            lastMessage: message,
          });

          const askFeedbackText = await this.getSystemReply(
            businessId,
            'ask_feedback_text',
            'Tell me your query, please.'
          );

          return { response: askFeedbackText, text: askFeedbackText, products: [], type: 'text' };
        }

        const actionResult = await ActionHandler.executeAction('CREATE_FEEDBACK', {
          session,
          businessId,
          phone,
          message,
        });

        await SessionService.updateSession(session, {
          step: 'menu',
          lastMessage: message,
        });

        const menuText = await this.getMenuText(businessId, customerName);
        return {
          response: `${actionResult.text}\n\n${menuText}`,
          text: `${actionResult.text}\n\n${menuText}`,
          products: [],
          type: 'text',
        };
      }

      if (session.step === 'ask_feedback_text') {
        const actionResult = await ActionHandler.executeAction('CREATE_FEEDBACK', {
          session,
          businessId,
          phone,
          message,
        });

        await SessionService.updateSession(session, {
          step: 'menu',
          lastMessage: message,
        });

        const menuText = await this.getMenuText(businessId, customerName);
        return {
          response: `${actionResult.text}\n\n${menuText}`,
          text: `${actionResult.text}\n\n${menuText}`,
          products: [],
          type: 'text',
        };
      }

      if (session.step === 'ask_support_order_id') {
        const actionResult = await ActionHandler.executeAction('START_SUPPORT', {
          session,
          businessId,
          phone,
          message,
        });

        if (!actionResult.success) {
          return {
            response: actionResult.text,
            text: actionResult.text,
            products: [],
            type: 'text',
          };
        }

        await SessionService.updateSession(session, {
          step: 'ask_support_feedback',
          context: {
            ...session.context,
            supportOrderId: actionResult.contextDelta?.supportOrderId,
            supportProductName: actionResult.contextDelta?.supportProductName,
          },
          lastMessage: message,
        });

        return {
          response: actionResult.text,
          text: actionResult.text,
          products: [],
          type: 'text',
        };
      }

      if (session.step === 'ask_support_feedback') {
        const actionResult = await ActionHandler.executeAction('CREATE_SUPPORT', {
          session,
          businessId,
          phone,
          message,
        });

        await SessionService.updateSession(session, {
          step: 'menu',
          context: {
            ...session.context,
            supportOrderId: null,
            supportProductName: null,
          },
          lastMessage: message,
        });

        const menuText = await this.getMenuText(businessId, customerName);
        return {
          response: `${actionResult.text}\n\n${menuText}`,
          text: `${actionResult.text}\n\n${menuText}`,
          products: [],
          type: 'text',
        };
      }

      const triggerToMatch = this.normalizeStepTrigger(session.step, msg);

      if (session.step === 'menu' && triggerToMatch === '1') {
        const showProductsResult = await ActionHandler.executeAction('SHOW_PRODUCTS', {
          session,
          businessId,
          phone,
          message,
        });

        return {
          response: showProductsResult.text,
          text: showProductsResult.text,
          products: showProductsResult.products || [],
          type: showProductsResult.type || 'product',
        };
      }

      const flow = await ChatbotFlow.findOne({
        businessId,
        trigger: triggerToMatch,
        step: session.step,
        isActive: true,
      }).lean();

      if (!flow) {
        if (session.step === 'menu') {
          if (triggerToMatch === '3') {
            await SessionService.updateSession(session, {
              step: 'ask_appointment_details',
              lastMessage: message,
            });

            const appointmentPrompt = await this.getSystemReply(
              businessId,
              'appointment_prompt',
              'Please share appointment date and time. Example: tomorrow 5pm'
            );
            return {
              response: appointmentPrompt,
              text: appointmentPrompt,
              products: [],
              type: 'text',
            };
          }

          if (triggerToMatch === '4') {
            await SessionService.updateSession(session, {
              step: 'ask_return_order_id',
              lastMessage: message,
            });

            return {
              response: await this.getSystemReply(
                businessId,
                'ask_return_order_id',
                'Please enter your order ID to request a return.'
              ),
              text: await this.getSystemReply(
                businessId,
                'ask_return_order_id',
                'Please enter your order ID to request a return.'
              ),
              products: [],
              type: 'text',
            };
          }

          if (triggerToMatch === '5') {
            await SessionService.updateSession(session, {
              step: 'ask_cancel_order_id',
              lastMessage: message,
            });

            return {
              response: await this.getSystemReply(
                businessId,
                'ask_cancel_order_id',
                'Please enter your order ID to cancel the order.'
              ),
              text: await this.getSystemReply(
                businessId,
                'ask_cancel_order_id',
                'Please enter your order ID to cancel the order.'
              ),
              products: [],
              type: 'text',
            };
          }

          if (triggerToMatch === '6') {
            await SessionService.updateSession(session, {
              step: 'ask_feedback_query',
              lastMessage: message,
            });

            return {
              response: await this.getSystemReply(
                businessId,
                'ask_feedback_query',
                'Please enter your existing query ID or type Continue to create a new query.'
              ),
              text: await this.getSystemReply(
                businessId,
                'ask_feedback_query',
                'Please enter your existing query ID or type Continue to create a new query.'
              ),
              products: [],
              type: 'text',
            };
          }

          if (triggerToMatch === '7') {
            await SessionService.updateSession(session, {
              step: 'ask_support_order_id',
              lastMessage: message,
            });

            return {
              response: await this.getSystemReply(
                businessId,
                'ask_support_order_id',
                'Please provide your order ID so we can assist you with support.'
              ),
              text: await this.getSystemReply(
                businessId,
                'ask_support_order_id',
                'Please provide your order ID so we can assist you with support.'
              ),
              products: [],
              type: 'text',
            };
          }

          const directProduct = await ActionHandler.executeAction('SAVE_PRODUCT', {
            session,
            businessId,
            phone,
            message,
          });

          if (directProduct?.matched) {
            const refreshedCustomer = await Customer.findOne({ phone, businessId }).lean();
            return this.startProductCheckout({
              session,
              businessId,
              message,
              actionResult: directProduct,
              customer: refreshedCustomer,
            });
          }
        }

        await SessionService.updateSession(session, { lastMessage: message });
        if (session.step === 'menu' || session.step === 'start') {
          await SessionService.updateSession(session, { step: 'menu' });
          const invalidMenuText = await this.getSystemReply(
            businessId,
            'invalid_menu_choice',
            `I didn't understand that choice. Please choose from menu:\n${await this.getMenuText(businessId, customerName)}`
          );
          return {
            response: invalidMenuText,
            text: invalidMenuText,
            products: [],
            type: 'text',
          };
        }
        return this.invalidOptionResponse(businessId);
      }

      let actionResult = null;
      const shouldDeferAppointmentAction = flow.action === 'BOOK_APPOINTMENT' && session.step === 'menu';

      if (flow.action && flow.action !== 'NONE' && !shouldDeferAppointmentAction) {
        actionResult = await ActionHandler.executeAction(flow.action, {
          session,
          businessId,
          phone,
          message,
        });
      }

      const nextStep = shouldDeferAppointmentAction
        ? (flow.nextStep || 'ask_appointment_details')
        : (flow.nextStep || session.step);

      const updatedContext = {
        ...session.context,
        ...(actionResult?.contextDelta || {}),
      };

      await SessionService.updateSession(session, {
        step: nextStep,
        context: updatedContext,
        lastMessage: message,
      });

      session = await SessionService.getOrCreateSession(phone, businessId);

      const defaultInvalidResponse = await this.getSystemReply(
        businessId,
        'invalid_option_generic',
        'Invalid option. Please try again.'
      );
      let replyText = actionResult?.text || flow.reply || defaultInvalidResponse;
      replyText = SessionService.interpolateTemplate(replyText, session);

      return {
        response: replyText,
        text: replyText,
        products: actionResult?.products || [],
        type: actionResult?.type || (actionResult?.products?.length ? 'product' : 'text'),
      };
    } catch (error) {
      console.error('[ChatbotEngine] chatbotEngine error:', {
        phone: arguments[0]?.phone,
        businessId: arguments[0]?.businessId,
        error: error.message,
        stack: error.stack,
      });

      const fallbackBusinessId = arguments[0]?.businessId;
      const systemErrorText = fallbackBusinessId
        ? await this.getSystemReply(
            fallbackBusinessId,
            'system_error',
            'Something went wrong. Please try again or type "menu".'
          )
        : 'Something went wrong. Please try again or type "menu".';

      return {
        response: systemErrorText,
        text: systemErrorText,
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
