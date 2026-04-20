import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import ChatbotFlow from '../models/ChatbotFlow.js';
import Business from '../models/Business.js';
import chatbotActions from './chatbotActions.js';

class ActionHandler {
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
    const configuredReply = String(flow?.reply || '').trim();
    return this.interpolate(configuredReply || fallback || 'No flow configured. Please contact admin.', vars);
  }

  async getBusinessType(businessId) {
    if (!businessId) return 'E_COMMERCE';
    const business = await Business.findById(businessId).select('businessType').lean();
    return business?.businessType || 'E_COMMERCE';
  }

  async executeAction(action, payload) {
    const { message, phone, businessId, session } = payload;
    
    // Ensure customer exists
    let customer = await Customer.findOne({ phone, businessId });
    if (!customer && action !== 'SAVE_NAME') {
       // Auto-create basic record if it doesn't exist?
       customer = await Customer.create({ phone, businessId });
    }

    const businessType = await this.getBusinessType(businessId);
    const actionData = { ...payload, customer };

    const ECOM_ONLY = new Set([
      'SHOW_PRODUCTS', 'SELECT_PRODUCT', 'SAVE_PRODUCT', 'SAVE_QUANTITY', 
      'SHOW_CART', 'CREATE_ORDER', 'ORDER_CONFIRMATION', 'GET_ORDERS', 
      'TRACK_ORDER', 'PROCESS_PAYMENT', 'VERIFY_PAYMENT', 'REQUEST_REFUND',
      'SAVE_ADDRESS'
    ]);

    const BOOKING_ONLY = new Set([
      'SHOW_SERVICES', 'SAVE_SERVICE', 'SAVE_DATE', 'SAVE_TIME', 
      'CHECK_AVAILABILITY', 'BOOK_APPOINTMENT', 'CANCEL_BOOKING', 
      'RESCHEDULE_BOOKING', 'GET_BOOKINGS'
    ]);

    if (businessType === 'BOOKING' && ECOM_ONLY.has(action)) {
      return { text: "This feature is only available for E-commerce businesses." };
    }
    if (businessType === 'E_COMMERCE' && BOOKING_ONLY.has(action)) {
      return { text: "This feature is only available for Booking businesses." };
    }

    switch (action) {
      // --- SYSTEM / NO-OP ---
      case 'JUST_SEND_REPLY':
      case 'NONE':
        return { success: true };

      // --- USER DATA ---
      case 'CREATE_CUSTOMER':
        return chatbotActions.CREATE_CUSTOMER(actionData);
      case 'SAVE_NAME':
        return chatbotActions.SAVE_NAME(actionData);
      case 'SAVE_USER_DETAILS':
        return chatbotActions.SAVE_USER_DETAILS(actionData);
      case 'SAVE_ADDRESS':
        return chatbotActions.SAVE_ADDRESS(actionData);

      // --- PRODUCT ---
      case 'SHOW_PRODUCTS':
        const productsRes = await chatbotActions.SHOW_PRODUCTS(actionData);
        return productsRes;
      case 'SELECT_PRODUCT':
        return chatbotActions.SELECT_PRODUCT(actionData);
      case 'SAVE_PRODUCT':
        return chatbotActions.SAVE_PRODUCT(actionData);
      case 'SAVE_QUANTITY':
        return chatbotActions.SAVE_QUANTITY(actionData);

      // --- ORDER ---
      case 'SHOW_CART':
        return chatbotActions.SHOW_CART(actionData);
      case 'CREATE_ORDER':
        return chatbotActions.CREATE_ORDER(actionData);
      case 'ORDER_CONFIRMATION':
        return chatbotActions.ORDER_CONFIRMATION(actionData);
      case 'GET_ORDERS':
        return chatbotActions.GET_ORDERS(actionData);
      case 'TRACK_ORDER':
        return chatbotActions.TRACK_ORDER(actionData);

      // --- PAYMENT ---
      case 'PROCESS_PAYMENT':
        return chatbotActions.PROCESS_PAYMENT(actionData);
      case 'VERIFY_PAYMENT':
        return chatbotActions.VERIFY_PAYMENT(actionData);

      // --- MANAGEMENT ---
      case 'CANCEL_ORDER':
        return chatbotActions.CANCEL_ORDER(actionData);
      case 'REQUEST_REFUND':
        return chatbotActions.REQUEST_REFUND(actionData);

      // --- BOOKING (Legacy/Booking Branch) ---
      case 'SHOW_SERVICES':
        const services = await chatbotActions.SHOW_SERVICES(actionData);
        return { text: services.message };
      case 'SAVE_SERVICE':
        return chatbotActions.SAVE_SERVICE(actionData);
      case 'SAVE_DATE':
        return chatbotActions.SAVE_DATE(actionData);
      case 'SAVE_TIME':
        return chatbotActions.SAVE_TIME(actionData);
      case 'CHECK_AVAILABILITY':
        return chatbotActions.CHECK_AVAILABILITY(actionData);
      case 'BOOK_APPOINTMENT':
        return chatbotActions.BOOK_APPOINTMENT(actionData);
      case 'CANCEL_BOOKING':
        return chatbotActions.CANCEL_BOOKING(actionData);
      case 'RESCHEDULE_BOOKING':
        return chatbotActions.RESCHEDULE_BOOKING(actionData);
      case 'GET_BOOKINGS':
        const bookings = await chatbotActions.GET_BOOKINGS(actionData);
        return { text: bookings.message };

      // --- SUPPORT ---
      case 'START_SUPPORT':
        const startSup = await chatbotActions.START_SUPPORT(actionData);
        session.mode = 'HUMAN';
        return { text: startSup.message };
      case 'CREATE_SUPPORT':
        return chatbotActions.CREATE_SUPPORT(actionData);

      // --- FEEDBACK ---
      case 'CREATE_FEEDBACK':
        return chatbotActions.CREATE_FEEDBACK(actionData);

      default:
        console.warn(`Action ${action} not implemented or recognized.`);
        return { text: null };
    }
  }
}

export default new ActionHandler();
