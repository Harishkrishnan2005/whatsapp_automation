import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import ChatbotFlow from '../models/ChatbotFlow.js';
import Business from '../models/Business.js';
import chatbotActions from './chatbotActions.js';

class ActionHandler {
  // ──────────────────────────────────────────────────────────────────────────
  // Template interpolation  e.g. "Hello {{name}}" → "Hello Alice"
  // ──────────────────────────────────────────────────────────────────────────
  // ──────────────────────────────────────────────────────────────────────────
  // Template interpolation  e.g. "Hello {{name}}" → "Hello Alice"
  // ──────────────────────────────────────────────────────────────────────────
  interpolate(text, vars = {}) {
    let output = String(text || '');
    // Task 4: SAFE VARIABLE REPLACEMENT
    return output.replace(/{{(.*?)}}/g, (_, key) => {
      const trimmedKey = key.trim();
      return vars[trimmedKey] || "";
    });
  }

  // ... (getSystemReply and getBusinessType remain similar)

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
    if (!businessId) return 'ecommerce';
    const business = await Business.findById(businessId).select('businessType business_type').lean();
    // Prefer business_type (lowercase) as requested by user, fallback to businessType
    return (business?.business_type || business?.businessType || 'ecommerce').toLowerCase();
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
      'ADD_TO_CART', 'CONTINUE_SHOPPING', 'CONFIRM_ORDER', 'VIEW_CART', 'REMOVE_FROM_CART', 'CLEAR_CART', 'CHECKOUT',
      'SHOW_CART', 'CREATE_ORDER', 'ORDER_CONFIRMATION', 'GET_ORDERS',
      'TRACK_ORDER', 'PROCESS_PAYMENT', 'VERIFY_PAYMENT', 'REQUEST_REFUND',
      'SAVE_ADDRESS', 'START_ORDER_CONFIRMATION', 'SAVE_CART_ITEM_QUANTITY', 'SAVE_PAYMENT_METHOD',
    ]);

    const BOOKING_ONLY = new Set([
      'SHOW_SERVICES', 'SAVE_SERVICE', 'SAVE_DATE', 'SAVE_TIME',
      'CHECK_AVAILABILITY', 'BOOK_APPOINTMENT', 'CANCEL_BOOKING',
      'RESCHEDULE_BOOKING', 'GET_BOOKINGS',
    ]);

    if (businessType === 'booking' && ECOM_ONLY.has(action)) {
      return { success: false, text: 'This feature is only available for E-commerce businesses.' };
    }
    if (businessType === 'ecommerce' && BOOKING_ONLY.has(action)) {
      return { success: false, text: 'This feature is only available for Booking businesses.' };
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
      case 'BUY_NOW':
      case 'SELECT_PRODUCT':     return chatbotActions.SELECT_PRODUCT(actionData);
      case 'SAVE_PRODUCT':       return chatbotActions.SAVE_PRODUCT(actionData);
      case 'SAVE_QUANTITY':      return chatbotActions.SAVE_QUANTITY(actionData);
      case 'ADD_TO_CART':        return chatbotActions.ADD_TO_CART(actionData);
      case 'CONTINUE_SHOPPING':  return chatbotActions.CONTINUE_SHOPPING(actionData);
      case 'CONFIRM_ORDER':      return chatbotActions.CONFIRM_ORDER(actionData);

      // Orders
      case 'SHOW_CART':
      case 'VIEW_CART':          return chatbotActions.SHOW_CART(actionData);
      case 'REMOVE_FROM_CART':   return chatbotActions.REMOVE_FROM_CART(actionData);
      case 'CLEAR_CART':         return chatbotActions.CLEAR_CART(actionData);
      case 'CHECKOUT':           return chatbotActions.CHECKOUT(actionData);
      case 'START_ORDER_CONFIRMATION': return chatbotActions.START_ORDER_CONFIRMATION(actionData);
      case 'SAVE_CART_ITEM_QUANTITY':  return chatbotActions.SAVE_CART_ITEM_QUANTITY(actionData);
      case 'SAVE_PAYMENT_METHOD':      return chatbotActions.SAVE_PAYMENT_METHOD(actionData);
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
        // Task 5: FIX ACTION HANDLER (Add default warning)
        if (String(action || '').startsWith('SAVE_')) {
          const fieldName = String(action).replace(/^SAVE_/, '');
          return chatbotActions.saveDynamicField({ ...actionData, fieldName });
        }
        console.warn("Unknown action:", action);
        return { success: false, text: 'This step is not configured correctly. Please try again.' };
    }
  }
}

export default new ActionHandler();
