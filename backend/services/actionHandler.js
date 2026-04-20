import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import ChatbotFlow from '../models/ChatbotFlow.js';
import Business from '../models/Business.js';
import chatbotActions from './chatbotActions.js';

class ActionHandler {
  // ──────────────────────────────────────────────────────────────────────────
  // Template interpolation  e.g. "Hello {{name}}" → "Hello Alice"
  // ──────────────────────────────────────────────────────────────────────────
  interpolate(text, vars = {}) {
    let output = String(text || '');
    for (const [key, value] of Object.entries(vars)) {
      output = output.replace(
        new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'),
        String(value ?? '')
      );
    }
    return output;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Fetch a configurable system message from the DB (step='system')
  // Falls back to the provided default if not configured.
  // ──────────────────────────────────────────────────────────────────────────
  async getSystemReply(businessId, trigger, fallback, vars = {}) {
    const flow = await ChatbotFlow.findOne({
      businessId,
      step: 'system',
      trigger,
      isActive: true,
    }).lean();
    const configuredReply = String(flow?.reply || '').trim();
    return this.interpolate(
      configuredReply || fallback || 'No flow configured. Please contact admin.',
      vars
    );
  }

  async getBusinessType(businessId) {
    if (!businessId) return 'E_COMMERCE';
    const business = await Business.findById(businessId).select('businessType').lean();
    return business?.businessType || 'E_COMMERCE';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // executeAction
  //
  // Central dispatcher:
  //   1. Ensure customer record exists (auto-create if needed)
  //   2. Guard cross-category actions
  //   3. Dispatch to chatbotActions.*
  //
  // All actions now return { success, text?, type?, products?, payment?, contextDelta? }
  // ──────────────────────────────────────────────────────────────────────────
  async executeAction(action, payload) {
    const { message, phone, businessId, session } = payload;

    // ── 1. Resolve customer ──────────────────────────────────────────────────
    let customer = await Customer.findOne({ phone, businessId });
    if (!customer) {
      // Auto-create a minimal record so downstream actions don't crash
      customer = await Customer.create({ phone, businessId, name: '' });
    }

    // Update session.customerId if not already set
    if (session && !session.customerId) {
      session.customerId = customer._id;
    }

    const businessType = await this.getBusinessType(businessId);
    const actionData = { ...payload, customer };

    // ── 2. Cross-category guards ─────────────────────────────────────────────
    const ECOM_ONLY = new Set([
      'SHOW_PRODUCTS', 'SELECT_PRODUCT', 'SAVE_PRODUCT', 'SAVE_QUANTITY',
      'SHOW_CART', 'CREATE_ORDER', 'ORDER_CONFIRMATION', 'GET_ORDERS',
      'TRACK_ORDER', 'PROCESS_PAYMENT', 'VERIFY_PAYMENT', 'REQUEST_REFUND',
      'SAVE_ADDRESS',
    ]);

    const BOOKING_ONLY = new Set([
      'SHOW_SERVICES', 'SAVE_SERVICE', 'SAVE_DATE', 'SAVE_TIME',
      'CHECK_AVAILABILITY', 'BOOK_APPOINTMENT', 'CANCEL_BOOKING',
      'RESCHEDULE_BOOKING', 'GET_BOOKINGS',
    ]);

    if (businessType === 'BOOKING' && ECOM_ONLY.has(action)) {
      return { text: 'This feature is only available for E-commerce businesses.' };
    }
    if (businessType === 'E_COMMERCE' && BOOKING_ONLY.has(action)) {
      return { text: 'This feature is only available for Booking businesses.' };
    }

    // ── 3. Dispatch ──────────────────────────────────────────────────────────
    switch (action) {
      // No-op / transparent pass-through
      case 'JUST_SEND_REPLY':
      case 'NONE':
        return { success: true };

      // User data
      case 'CREATE_CUSTOMER':    return chatbotActions.CREATE_CUSTOMER(actionData);
      case 'SAVE_NAME':          return chatbotActions.SAVE_NAME(actionData);
      case 'SAVE_AGE':           return chatbotActions.saveDynamicField({ ...actionData, fieldName: 'age' });
      case 'SAVE_UPI':
      case 'SAVE_UPI_ID':        return chatbotActions.saveDynamicField({ ...actionData, fieldName: 'upiId' });
      case 'SAVE_USER_DETAILS':  return chatbotActions.SAVE_USER_DETAILS(actionData);
      case 'SAVE_ADDRESS':       return chatbotActions.SAVE_ADDRESS(actionData);

      // Products
      case 'SHOW_PRODUCTS':      return chatbotActions.SHOW_PRODUCTS(actionData);
      case 'SELECT_PRODUCT':     return chatbotActions.SELECT_PRODUCT(actionData);
      case 'SAVE_PRODUCT':       return chatbotActions.SAVE_PRODUCT(actionData);
      case 'SAVE_QUANTITY':      return chatbotActions.SAVE_QUANTITY(actionData);

      // Orders
      case 'SHOW_CART':          return chatbotActions.SHOW_CART(actionData);
      case 'CREATE_ORDER':       return chatbotActions.CREATE_ORDER(actionData);
      case 'ORDER_CONFIRMATION': return chatbotActions.ORDER_CONFIRMATION(actionData);
      case 'GET_ORDERS':         return chatbotActions.GET_ORDERS(actionData);
      case 'TRACK_ORDER':        return chatbotActions.TRACK_ORDER(actionData);

      // Payment
      case 'PROCESS_PAYMENT':    return chatbotActions.PROCESS_PAYMENT(actionData);
      case 'VERIFY_PAYMENT':     return chatbotActions.VERIFY_PAYMENT(actionData);

      // Order management
      case 'CANCEL_ORDER':       return chatbotActions.CANCEL_ORDER(actionData);
      case 'REQUEST_REFUND':     return chatbotActions.REQUEST_REFUND(actionData);

      // Booking
      case 'SHOW_SERVICES':      return chatbotActions.SHOW_SERVICES(actionData);
      case 'SAVE_SERVICE':       return chatbotActions.SAVE_SERVICE(actionData);
      case 'SAVE_DATE':          return chatbotActions.SAVE_DATE(actionData);
      case 'SAVE_TIME':          return chatbotActions.SAVE_TIME(actionData);
      case 'CHECK_AVAILABILITY': return chatbotActions.CHECK_AVAILABILITY(actionData);
      case 'BOOK_APPOINTMENT':   return chatbotActions.BOOK_APPOINTMENT(actionData);
      case 'CANCEL_BOOKING':     return chatbotActions.CANCEL_BOOKING(actionData);
      case 'RESCHEDULE_BOOKING': return chatbotActions.RESCHEDULE_BOOKING(actionData);
      case 'GET_BOOKINGS':       return chatbotActions.GET_BOOKINGS(actionData);

      // Support
      case 'START_SUPPORT':      return chatbotActions.START_SUPPORT(actionData);
      case 'CREATE_SUPPORT':     return chatbotActions.CREATE_SUPPORT(actionData);

      // Feedback
      case 'CREATE_FEEDBACK':    return chatbotActions.CREATE_FEEDBACK(actionData);

      default:
        if (String(action || '').startsWith('SAVE_')) {
          const fieldName = String(action).replace(/^SAVE_/, '');
          return chatbotActions.saveDynamicField({ ...actionData, fieldName });
        }
        console.warn(`[ActionHandler] Action "${action}" is not implemented.`);
        return { text: null, success: false };
    }
  }
}

export default new ActionHandler();
