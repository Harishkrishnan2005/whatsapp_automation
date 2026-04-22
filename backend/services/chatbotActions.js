import SupportTicket from '../models/SupportTicket.js';
import Feedback from '../models/Feedback.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Appointment from '../models/Appointment.js';
import Customer from '../models/Customer.js';
import Business from '../models/Business.js';
import OrderService from './orderService.js';
import SupportService from './supportService.js';
import FeedbackService from './feedbackService.js';
import AppointmentService from './appointmentService.js';
import mongoose from 'mongoose';
import { resolveBusinessPlan } from '../config/plans.js';

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Generate all HH:mm slots for a day from 09:00 → 18:00 at 30-min intervals.
 * Configurable per business in future; hardcoded sensible default for now.
 */
function generateDaySlots(startHour = 9, endHour = 18, intervalMinutes = 30) {
  const slots = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += intervalMinutes) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
}

function parseDateStr(dateStr) {
  const raw = String(dateStr || '').trim();
  if (!raw) return null;

  const ddmmyyyy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    const isValid =
      parsed.getUTCFullYear() === Number(year) &&
      parsed.getUTCMonth() === Number(month) - 1 &&
      parsed.getUTCDate() === Number(day);

    return isValid ? parsed : null;
  }

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, year, month, day] = iso;
    const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    const isValid =
      parsed.getUTCFullYear() === Number(year) &&
      parsed.getUTCMonth() === Number(month) - 1 &&
      parsed.getUTCDate() === Number(day);

    return isValid ? parsed : null;
  }

  return null;
}

/**
 * Return start-of-day and end-of-day UTC boundaries for a given Date object.
 */
function dayBounds(dateObj) {
  const start = new Date(dateObj);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(dateObj);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

function parseTimeToMinutes(time) {
  const match = String(time || '').trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return (Number(match[1]) * 60) + Number(match[2]);
}

function formatMinutesToSlot(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// ─── main actions class ───────────────────────────────────────────────────────

class ChatbotActions {
  syncCartState(session, cart) {
    session.collectedData = session.collectedData || {};
    session.context = session.context || {};
    session.collectedData.cart = cart;
    session.context.cart = cart;
    session.markModified('collectedData');
    session.markModified('context');
  }

  buildCartSummary(cart = []) {
    if (!Array.isArray(cart) || cart.length === 0) {
      return 'Your cart is empty.';
    }

    let totalAmountLegacy = 0;
    const lines = cart.map((item, index) => {
      const quantity = Math.max(1, Number(item.quantity || 1));
      const price = Number(item.price || 0);
      const subtotal = price * quantity;
      totalAmountLegacy += subtotal;
      return `${index + 1}. ${item.productName} x ${quantity} = Rs ${subtotal.toFixed(2)}`;
    });

    return `${lines.join('\n')}\n\nTotal: Rs ${totalAmountLegacy.toFixed(2)}`;
  }

  normalizeCustomerField(fieldName) {
    const normalized = String(fieldName || '').trim().toLowerCase();
    const aliases = {
      user_details: 'age',
      age: 'age',
      full_name: 'name',
      customer_name: 'name',
      name: 'name',
      address: 'address',
      upi: 'upiId',
      upi_id: 'upiId',
      upiid: 'upiId',
    };

    return aliases[normalized] || String(fieldName || '').trim();
  }

  async saveDynamicField({ session, message, customer, fieldName }) {
    const targetField = this.normalizeCustomerField(fieldName);
    const rawValue = String(message || '').trim();

    if (!rawValue) {
      return { success: false, text: `Please enter a valid ${targetField}.` };
    }

    let parsedValue = rawValue;

    if (targetField === 'age') {
      const age = Number.parseInt(rawValue, 10);
      if (!Number.isInteger(age) || age < 1 || age > 120) {
        if (/[a-z]/i.test(rawValue)) {
          session.collectedData = session.collectedData || {};
          session.collectedData.name = rawValue;
          session.context = session.context || {};
          session.context.name = rawValue;
          session.markModified('collectedData');
          session.markModified('context');

          if (customer?.schema?.path('name')) {
            customer.name = rawValue;
            await customer.save();
          }

          return {
            success: true,
            text: 'Please enter your age (1-120).',
            nextStep: session.currentStep,
            awaitingField: 'age',
          };
        }

        return { success: false, text: 'Please enter a valid age between 1 and 120.' };
      }
      parsedValue = age;
    }

    session.collectedData = session.collectedData || {};
    session.collectedData[targetField] = parsedValue;
    session.context = session.context || {};
    session.context[targetField] = parsedValue;
    session.markModified('collectedData');
    session.markModified('context');

    if (customer?.schema?.path(targetField)) {
      customer[targetField] = parsedValue;
      await customer.save();
    }

    return { success: true };
  }

  async getAppointmentConfig(businessId, dateObj) {
    const business = await Business.findById(businessId)
      .select('appointmentConfig')
      .lean();

    const appointmentConfig = business?.appointmentConfig || {};
    const slotDuration = Number(appointmentConfig.slotDuration) > 0
      ? Number(appointmentConfig.slotDuration)
      : 30;

    const weekday = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone: 'UTC',
    }).format(dateObj);

    const workingHours = Array.isArray(appointmentConfig.workingHours)
      ? appointmentConfig.workingHours
      : [];

    const activeSchedule = workingHours.find(
      (slot) => slot?.day === weekday && slot?.isActive !== false
    );

    const startMinutes = parseTimeToMinutes(activeSchedule?.start || '09:00') ?? 540;
    const endMinutes = parseTimeToMinutes(activeSchedule?.end || '18:00') ?? 1080;

    const slots = [];
    for (let minutes = startMinutes; minutes < endMinutes; minutes += slotDuration) {
      slots.push(formatMinutesToSlot(minutes));
    }

    return {
      slots,
      weekday,
      slotDuration,
      isActiveDay: Boolean(activeSchedule || workingHours.length === 0),
    };
  }

  async getFreeSlotsForDate(businessId, dateObj) {
    const { start, end } = dayBounds(dateObj);
    const config = await this.getAppointmentConfig(businessId, dateObj);

    if (!config.isActiveDay) {
      return {
        ...config,
        freeSlots: [],
        bookedSet: new Set(),
      };
    }

    const bookedSlots = await Appointment.find({
      businessId,
      date: { $gte: start, $lte: end },
      status: { $in: ['BOOKED', 'RESCHEDULED'] },
    })
      .select('time')
      .lean();

    const bookedSet = new Set(bookedSlots.map((item) => item.time));
    const freeSlots = config.slots.filter((slot) => !bookedSet.has(slot));

    return {
      ...config,
      freeSlots,
      bookedSet,
    };
  }

  // ==========================================================================
  // USER DATA ACTIONS
  // ==========================================================================

  async CREATE_CUSTOMER({ phone, businessId }) {
    let customer = await Customer.findOne({ phone, businessId });
    if (!customer) {
      customer = await Customer.create({ phone, businessId, status: 'new' });
    }
    return { success: true, customer };
  }

  /**
   * SAVE_NAME: persist name onto customer record + session collectedData.
   * collectedData is the canonical store; context kept in sync for interpolation.
   */
  async SAVE_NAME({ session, message, customer }) {
    const name = String(message || '').trim();
    if (!name) return { success: false, text: 'Please enter a valid name.' };

    // Write to both stores so interpolation {{name}} works regardless of which
    // session property older code reads from.
    session.collectedData = session.collectedData || {};
    session.collectedData.name = name;
    session.context = session.context || {};
    session.context.name = name;
    session.markModified('collectedData');
    session.markModified('context');

    if (customer) {
      customer.name = name;
      await customer.save();
    }
    return { success: true };
  }

  async SAVE_USER_DETAILS({ session, message, customer }) {
    const parts = String(message || '').trim().split(/\s+/);
    const name = parts[0];
    const age = parseInt(parts[1], 10);

    if (!name || isNaN(age)) {
      return { 
        success: false, 
        text: "Please enter name and age like: Harish 22" 
      };
    }

    session.collectedData = session.collectedData || {};
    session.collectedData.name = name;
    session.collectedData.age = age;
    
    session.context = session.context || {};
    session.context.name = name;
    session.context.age = age;
    
    session.markModified('collectedData');
    session.markModified('context');

    if (customer) {
      customer.name = name;
      customer.age = age;
      await customer.save();
    }

    return { 
      success: true,
      nextStep: 'menu'
    };
  }

  async SAVE_ADDRESS({ session, message, customer }) {
    const address = String(message || '').trim();
    if (!address) return { success: false, text: 'Please enter a valid address.' };

    session.collectedData = session.collectedData || {};
    session.collectedData.address = address;
    session.context = session.context || {};
    session.context.address = address;
    session.markModified('collectedData');
    session.markModified('context');

    if (customer) {
      customer.address = address;
      await customer.save();
    }
    return { success: true };
  }

  // ==========================================================================
  // PRODUCT ACTIONS
  // ==========================================================================

  async SHOW_PRODUCTS({ businessId }) {
    // Task 6: FIX SHOW_PRODUCTS ACTION
    const products = await Product.find({ businessId, isActive: true }).lean();
    if (!products || products.length === 0) {
      return { 
        text: 'No products available yet. Check back soon!', 
        success: true,
        type: 'text',
        products: []
      };
    }
    return {
      type: 'product',
      products: products.map((p) => ({
        id: p._id,
        name: p.name,
        price: p.offerPrice || p.mrp,
        mrp: p.mrp,
        offerPrice: p.offerPrice,
        offerPercentage: p.offerPercentage,
        image: p.image,
        category: p.category,
        unitType: p.unitType
      })),
      success: true,
    };
  }

  async SELECT_PRODUCT({ session, message, businessId, payload }) {
    let product = null;
    const productId = payload?.productId;
    let parsedQuantity = null;

    if (productId) {
      product = await Product.findById(productId).lean();
    } else {
      const cleanMessage = String(message || '')
        .replace(/^(add to cart|buy|select|get|order|i want|want to buy)\s+/i, '')
        .replace(/^(\d+)\s+(of|units? of|x)\s+/i, (match, qty) => {
          parsedQuantity = parseInt(qty, 10);
          return '';
        })
        .replace(/\s+(\d+)$/, (match, qty) => {
          if (!parsedQuantity) parsedQuantity = parseInt(qty, 10);
          return '';
        })
        .trim();

      product = await Product.findOne({
        businessId,
        $or: [
          { name: new RegExp(cleanMessage, 'i') },
          {
            _id: mongoose.Types.ObjectId.isValid(cleanMessage)
              ? new mongoose.Types.ObjectId(cleanMessage)
              : new mongoose.Types.ObjectId(),
          },
        ],
      }).lean();

    }

    if (!product) return { success: false, text: 'Product not found. Please try again.' };

    // Reset selection context to prevent interference
    session.collectedData = session.collectedData || {};
    delete session.collectedData.productId;
    delete session.collectedData.productName;
    delete session.collectedData.productPrice;
    delete session.collectedData.quantity;
    delete session.collectedData.total;

    session.collectedData.productId = String(product._id);
    session.collectedData.productName = product.name;
    const price = product.offerPrice || product.mrp;
    session.collectedData.productPrice = price;
    
    if (parsedQuantity) {
      session.collectedData.quantity = parsedQuantity;
      session.collectedData.total = (price * parsedQuantity).toFixed(2);
    } else {
      session.collectedData.total = price.toFixed(2);
    }
    
    session.context = { ...(session.context || {}), ...session.collectedData };
    session.markModified('collectedData');
    session.markModified('context');

    // For cart-first flow: If quantity is provided, add to cart directly
    // Otherwise, show product details and ask for quantity
    if (parsedQuantity) {
      return this.ADD_TO_CART({ session, payload: { productId: session.collectedData.productId, quantity: parsedQuantity } });
    }

    return { 
      success: true, 
      text: `Selected: ${product.name} (₹${price}).\n\nHow many units do you want?`,
      nextStep: 'get_quantity'
    };
  }

  async SAVE_PRODUCT({ session, message }) {
    session.collectedData = session.collectedData || {};
    session.collectedData.productId = message.trim();
    session.context = session.context || {};
    session.context.productId = message.trim();
    session.markModified('collectedData');
    session.markModified('context');
    return { success: true };
  }

  async SAVE_QUANTITY({ session, message }) {
    const qty = parseInt(message, 10);
    if (isNaN(qty) || qty < 1) {
      return { success: false, text: 'Please enter a valid quantity (1 or more).' };
    }
    session.collectedData = session.collectedData || {};
    session.collectedData.quantity = qty;
    
    // Calculate total if price is available
    const price = session.collectedData.productPrice || session.context?.productPrice || 0;
    if (price) {
      const total = (price * qty).toFixed(2);
      session.collectedData.total = total;
      session.context = session.context || {};
      session.context.total = total;
    }

    session.context = session.context || {};
    session.context.quantity = qty;
    session.markModified('collectedData');
    session.markModified('context');

    if (!session.collectedData.productId) {
      return { success: false, text: 'No product selected. Please choose a product first.' };
    }

    return this.ADD_TO_CART({
      session,
      payload: {
        productId: session.collectedData.productId,
        quantity: qty
      }
    });
  }

  async ADD_TO_CART({ session, payload }) {
    let productId = payload?.productId;
    let quantity = Math.max(1, Number(payload?.quantity || 1));
    let productName = '';
    let productPrice = 0;

    if (!productId) return { success: false, text: 'No product selected.' };

    const product = await Product.findById(productId).lean();
    if (!product) return { success: false, text: 'Product not found.' };

    productName = product.name;
    productPrice = product.offerPrice || product.mrp;

    session.collectedData = session.collectedData || {};
    session.collectedData.cart = session.collectedData.cart || [];
    
    // Check if product already in cart
    const existingIndex = session.collectedData.cart.findIndex(item => String(item.productId) === String(productId));
    if (existingIndex > -1) {
      session.collectedData.cart[existingIndex].quantity += quantity;
    } else {
      session.collectedData.cart.push({
        productId,
        productName,
        price: productPrice,
        quantity
      });
    }

    this.syncCartState(session, session.collectedData.cart);

    // CART-FIRST FLOW: Show decision buttons instead of asking quantity
    // ✅ Item added to cart.
    // Would you like to continue shopping or confirm your order?
    const cartCount = session.collectedData.cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
    const cartTotal = session.collectedData.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);

    return {
      success: true,
      text: `✅ Item added to cart.\nWould you like to continue shopping or confirm your order?\n\nCart: ${cartCount} item(s) | Total: Rs ${cartTotal}`,
      type: 'quick_reply',
      nextStep: 'cart_decision',
      products: [{
        id: 'continue_shopping',
        name: 'Continue Shopping',
        action: 'CONTINUE_SHOPPING'
      },
      {
        id: 'confirm_order',
        name: 'Confirm Order',
        action: 'CONFIRM_ORDER'
      }]
    };

    return { 
      success: true, 
      text: `✅ ${productName} added to cart.\n\n🛒 Cart (${cartCount} items) • Total: ₹${cartTotal}\n\nWhat next?`,
      type: 'quick_reply',
      nextStep: 'cart_decision',
      products: [{
        id: 'continue_shopping',
        name: 'Continue Shopping',
        action: 'CONTINUE_SHOPPING'
      },
      {
        id: 'confirm_order',
        name: 'Confirm Order',
        action: 'CONFIRM_ORDER'
      }]
    };
  }

  async START_ORDER_CONFIRMATION({ session }) {
    const cart = session.collectedData?.cart || [];
    if (cart.length === 0) {
      return { success: false, text: 'Your cart is empty! Add some products first.', nextStep: 'browse' };
    }

    // Initialize iteration
    session.collectedData.currentCartIndex = 0;
    session.markModified('collectedData');

    const firstItem = cart[0];
    const summary = this.buildCartSummary(cart);

    return {
      success: true,
      text: `Cart Summary:\n${summary}\n\nHow many units of ${firstItem.productName} do you want?`,
      nextStep: 'confirm_quantities'
    };

    return {
      success: true,
      text: `Order Confirmation:\n\nHow many units of *${firstItem.productName}* (₹${firstItem.price}) do you want?`,
      nextStep: 'collect_cart_quantities'
    };
  }

  /**
   * CART-FIRST FLOW: When user clicks "Continue Shopping"
   * Show product list again and allow adding more items
   */
  async CONTINUE_SHOPPING({ session, businessId }) {
    // Return to product browsing
    const products = await Product.find({ businessId, isActive: true }).lean();
    if (!products || products.length === 0) {
      return { 
        text: 'No products available. Please try again later!', 
        success: true,
        type: 'text',
        nextStep: 'browse',
        products: []
      };
    }

    const cart = session.collectedData?.cart || [];
    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);

    return {
      type: 'product',
      text: `Cart: ${cart.length} item(s) | Rs ${cartTotal}\n\nChoose a product to add:`,
      products: products.map((p) => ({
        id: p._id,
        name: p.name,
        price: p.offerPrice || p.mrp,
        mrp: p.mrp,
        offerPrice: p.offerPrice,
        offerPercentage: p.offerPercentage,
        image: p.image,
        category: p.category,
        unitType: p.unitType
      })),
      success: true,
      nextStep: 'browse'
    };
    
    return {
      type: 'product',
      text: `🛒 Cart (${cart.length} items) • ₹${cartTotal}\n\nChoose a product to add:`,
      products: products.map((p) => ({
        id: p._id,
        name: p.name,
        price: p.offerPrice || p.mrp,
        mrp: p.mrp,
        offerPrice: p.offerPrice,
        offerPercentage: p.offerPercentage,
        image: p.image,
        category: p.category,
        unitType: p.unitType
      })),
      success: true,
      nextStep: 'browse'
    };
  }

  /**
   * CART-FIRST FLOW: When user clicks "Confirm Order"
   * Start quantity confirmation for all cart items
   */
  async CONFIRM_ORDER({ session }) {
    const cart = session.collectedData?.cart || [];
    if (cart.length === 0) {
      return { success: false, text: 'Your cart is empty! Add some products first.', nextStep: 'browse' };
    }

    // Initialize iteration for quantity confirmation
    session.collectedData.currentCartIndex = 0;
    session.collectedData.quantityConfirmationMode = true;
    session.markModified('collectedData');

    const firstItem = cart[0];
    const summary = this.buildCartSummary(cart);

    return {
      success: true,
      text: `Cart Summary:\n${summary}\n\nHow many units of ${firstItem.productName} do you want?`,
      nextStep: 'confirm_quantities'
    };

    return {
      success: true,
      text: `📋 Let's confirm quantities:\n\nHow many units of *${firstItem.productName}* (₹${firstItem.price}) do you want?`,
      nextStep: 'confirm_quantities'
    };
  }

  async SAVE_CART_ITEM_QUANTITY({ session, message }) {
    const qty = parseInt(message, 10);
    if (isNaN(qty) || qty < 1) {
      return { success: false, text: 'Please enter a valid number (1 or more).' };
    }

    const cart = session.collectedData?.cart || [];
    const index = session.collectedData.currentCartIndex || 0;

    if (cart[index]) {
      cart[index].quantity = qty;
    }
    this.syncCartState(session, cart);

    const nextIndex = index + 1;
    session.collectedData.currentCartIndex = nextIndex;
    session.markModified('collectedData');

    if (nextIndex < cart.length) {
      const nextItem = cart[nextIndex];
      return {
        success: true,
        text: `How many units of ${nextItem.productName} do you want?`,
        nextStep: 'confirm_quantities'
      };

      return {
        success: true,
        text: `Got it. How many units of *${nextItem.productName}* (₹${nextItem.price})?`,
        nextStep: 'confirm_quantities'
      };
    }

    let totalAmount = 0;
    let cleanSummary = 'Cart Summary:\n';
    cart.forEach(item => {
      const subtotal = item.price * item.quantity;
      totalAmount += subtotal;
      cleanSummary += `- ${item.productName} x ${item.quantity} = Rs ${subtotal.toFixed(2)}\n`;
    });

    cleanSummary += `\nTotal: Rs ${totalAmount.toFixed(2)}`;
    session.collectedData.totalAmount = totalAmount;
    session.context = session.context || {};
    session.context.totalAmount = totalAmount;
    session.markModified('collectedData');
    session.markModified('context');

    const paymentOptions = totalAmount > 5000
      ? [{ id: 'online', name: 'Online Payment' }]
      : [
          { id: 'cod', name: 'Cash on Delivery' },
          { id: 'online', name: 'Online Payment' }
        ];

    return {
      success: true,
      text: totalAmount > 5000
        ? `${cleanSummary}\n\nSelect payment method\nOnly Online Payment is available for orders above Rs 5000.`
        : `${cleanSummary}\n\nSelect payment method`,
      type: 'quick_reply',
      nextStep: 'select_payment',
      products: paymentOptions
    };

    {
    // Finished all items, calculate total and determine payment
    let totalAmountLegacy = 0;
    let summary = "✅ Order Summary:\n\n";
    cart.forEach(item => {
      const subtotal = item.price * item.quantity;
      totalAmount += subtotal;
      summary += `• ${item.productName} × ${item.quantity} = ₹${subtotal.toFixed(2)}\n`;
    });

    summary += `\n*Total: ₹${totalAmount.toFixed(2)}*`;
    session.collectedData.totalAmount = totalAmount;
    session.markModified('collectedData');

    let paymentText = "\n\n💳 Select Payment Method:\n";
    let paymentOptions = [
      { id: 'online', name: '💳 Online Payment' }
    ];
    
    if (totalAmountLegacy <= 5000) {
      paymentText += "1. Online Payment\n2. Cash on Delivery (COD)";
      paymentOptions.push({ id: 'cod', name: '🏠 Cash on Delivery' });
    } else {
      paymentText += "1. Online Payment\n\n(COD not available for orders above ₹5000)";
    }

    return {
      success: true,
      text: `${summary}${paymentText}`,
      type: 'quick_reply',
      nextStep: 'select_payment',
      products: paymentOptions
    };
    }
  }

  async SAVE_PAYMENT_METHOD({ session, message }) {
    const input = String(message || '').trim().toLowerCase();
    const totalAmount = session.collectedData.totalAmount || 0;
    
    let method = '';
    if (input === '1' || input.includes('online')) {
      method = 'ONLINE';
    } else if ((input === '2' || input.includes('cash') || input.includes('cod')) && totalAmount <= 5000) {
      method = 'COD';
    } else {
      return { success: false, text: 'Invalid selection or method unavailable for this amount. Please try again.' };
    }

    session.collectedData.paymentMethod = method;
    session.context = session.context || {};
    session.context.paymentMethod = method;
    session.markModified('collectedData');
    session.markModified('context');

    return this.CREATE_ORDER({
      session,
      businessId: session.businessId,
      customer: {
        _id: session.customerId
      }
    });
  }

  async REMOVE_FROM_CART({ session, message }) {
    const searchTerm = String(message || '').trim();
    if (!searchTerm) return { success: false, text: 'Please specify which product to remove.' };

    const cart = session.collectedData.cart || [];
    const initialCount = cart.length;
    
    session.collectedData.cart = cart.filter(
      item => !new RegExp(searchTerm, 'i').test(item.productName)
    );
    
    if (session.collectedData.cart.length === initialCount) {
      return { success: false, text: `Product "${searchTerm}" not found in your cart.` };
    }

    session.context = { ...(session.context || {}), cart: session.collectedData.cart };
    session.markModified('collectedData');
    session.markModified('context');

    return { success: true, text: `🗑 Removed "${searchTerm}" from your cart.` };
  }

  async CLEAR_CART({ session }) {
    session.collectedData.cart = [];
    session.context = { ...(session.context || {}), cart: [] };
    session.markModified('collectedData');
    session.markModified('context');
    return { success: true, text: 'Your cart has been cleared.' };
  }

  async CHECKOUT({ session }) {
    const data = session.collectedData || session.context || {};
    const cart = data.cart || [];
    
    if (cart.length === 0 && !data.productId) {
      return { success: false, text: 'Your cart is empty. Please add some products first.' };
    }

    return { success: true, text: 'Proceeding to checkout. Please provide your delivery address.' };
  }

  // ==========================================================================
  // ORDER ACTIONS
  // ==========================================================================

  async SHOW_CART({ session }) {
    const data = session.collectedData || session.context || {};
    const cart = data.cart || [];
    
    // Backwards compatibility for single item flow
    const { productName, productPrice, quantity = 1 } = data;
    
    if (cart.length === 0 && !productName) {
      return { text: 'Your cart is empty.', success: true };
    }

    let text = '🛒 *Your Cart Summary:*\n\n';
    let grandTotal = 0;

    if (cart.length > 0) {
      cart.forEach((item, index) => {
        const itemTotal = (item.price * item.quantity).toFixed(2);
        text += `${index + 1}. *${item.productName}*\n   Qty: ${item.quantity} × ₹${item.price} = ₹${itemTotal}\n\n`;
        grandTotal += Number(itemTotal);
      });
    } else if (productName) {
      const total = (productPrice * quantity).toFixed(2);
      text += `1. *${productName}*\n   Qty: ${quantity} × ₹${productPrice} = ₹${total}\n\n`;
      grandTotal = Number(total);
    }

    text += `*Grand Total: ₹${grandTotal.toFixed(2)}*`;
    
    return {
      text,
      success: true,
    };
  }

  async CREATE_ORDER({ session, businessId, customer }) {
    const data = session.collectedData || session.context || {};
    const { productId, productName, productPrice, quantity = 1, address, cart = [] } = data;

    const orderItems = cart.length > 0 ? cart : (productId ? [{ productId, productName, price: productPrice, quantity }] : []);
    
    if (orderItems.length === 0) {
      return { success: false, text: 'Cannot create order: Cart is empty.' };
    }

    const customerId = customer?._id || session.customerId;
    const resolvedBusinessId = businessId || session.businessId;

    const creation = await OrderService.createOrder({
      customerId,
      items: orderItems,
      product: orderItems.length > 1 ? `${orderItems[0].productName} + ${orderItems.length - 1} more` : orderItems[0].productName,
      address: address || customer?.address || 'Address provided via chat',
      businessId: resolvedBusinessId,
      paymentType: data.paymentMethod || 'COD',
      amount: data.totalAmount
    });

    session.collectedData = session.collectedData || {};
    session.collectedData.currentOrderId = String(creation.order._id);
    session.collectedData.cart = [];
    session.collectedData.currentCartIndex = 0;
    session.collectedData.quantityConfirmationMode = false;
    session.context = session.context || {};
    session.context.currentOrderId = session.collectedData.currentOrderId;
    session.context.cart = [];
    
    session.markModified('collectedData');
    session.markModified('context');

    return {
      success: true,
      text: `✅ Your order has been placed successfully!\nOrder ID: #${creation.order.orderId || creation.order._id}`,
      nextStep: 'start'
    };

    return {
      success: true,
      text: `✅ Order ${creation.order.orderId || creation.order._id} confirmed! We'll notify you when it ships.`,
    };
  }

  async ORDER_CONFIRMATION({ session }) {
    const orderId = (session.collectedData || session.context || {}).currentOrderId;
    const order = orderId ? await Order.findById(orderId).lean() : null;
    return {
      text: `✅ Thank you! Your Order ID is ${order?.orderId || orderId || 'N/A'}. We will notify you when it ships.`,
      success: true,
    };
  }

  async GET_ORDERS({ businessId, customer }) {
    const orders = await Order.find({ businessId, customerId: customer._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    if (orders.length === 0) return { text: 'You have no orders yet.', success: true };

    const list = orders
      .map((o) => `📦 ${o.orderId || o._id}: ${o.product} – ₹${o.amount} (${o.orderStatus})`)
      .join('\n');
    return { text: `Your Recent Orders:\n${list}`, success: true };
  }

  async TRACK_ORDER({ message, businessId, customer }) {
    const orderId = message.trim();
    const order = await Order.findOne({
      businessId,
      customerId: customer._id,
      $or: [
        { orderId },
        {
          _id: mongoose.Types.ObjectId.isValid(orderId)
            ? new mongoose.Types.ObjectId(orderId)
            : new mongoose.Types.ObjectId(),
        },
      ],
    }).lean();

    if (!order) return { success: false, text: 'Order not found. Please check your Order ID.' };
    return { text: `Status of Order ${order.orderId || order._id}: *${order.orderStatus}*`, success: true };
  }

  // ==========================================================================
  // PAYMENT ACTIONS
  // ==========================================================================

  async PROCESS_PAYMENT({ session, businessId, customer }) {
    const data = session.collectedData || session.context || {};
    const { productId, productName, productPrice, quantity = 1, address, cart = [] } = data;

    const orderItems = cart.length > 0 ? cart : (productId ? [{ productId, productName, price: productPrice, quantity }] : []);

    if (orderItems.length === 0) {
      return { success: false, text: 'Cannot process payment: Cart is empty.' };
    }

    const creation = await OrderService.createOrder({
      customerId: customer._id,
      items: orderItems,
      product: orderItems.length > 1 ? `${orderItems[0].productName} + ${orderItems.length - 1} more` : orderItems[0].productName,
      address: address || customer.address,
      businessId,
      paymentType: 'ONLINE',
    });

    if (creation.payment?.error) {
      return { success: false, text: `Payment initialization failed: ${creation.payment.error}` };
    }

    return {
      type: 'payment',
      payment: {
        keyId: creation.payment.keyId,
        amount: Math.round(creation.order.amount * 100),
        currency: 'INR',
        razorpayOrderId: creation.payment.razorpayOrderId,
        internalOrderId: creation.order._id,
        customer: { name: customer.name, contact: customer.phone },
      },
      success: true,
    };
  }

  async VERIFY_PAYMENT({ message, businessId }) {
    const { razorpay_payment_id, razorpay_order_id } = message || {};
    const order = await Order.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id, businessId },
      { paymentStatus: 'Paid', razorpayPaymentId: razorpay_payment_id },
      { new: true }
    ).lean();
    return { success: true, text: `Payment verified for Order ${order?.orderId || order?._id}.` };
  }

  // ==========================================================================
  // ORDER MANAGEMENT
  // ==========================================================================

  async CANCEL_ORDER({ message, businessId, customer }) {
    const orderId = message.trim();
    const order = await Order.findOneAndUpdate(
      {
        businessId,
        customerId: customer._id,
        $or: [
          { orderId },
          {
            _id: mongoose.Types.ObjectId.isValid(orderId)
              ? new mongoose.Types.ObjectId(orderId)
              : new mongoose.Types.ObjectId(),
          },
        ],
      },
      { orderStatus: 'Cancelled', status: 'Cancelled' },
      { new: true }
    ).lean();
    if (!order) return { success: false, text: 'Order not found.' };
    return { success: true, text: 'Your order has been cancelled.' };
  }

  async REQUEST_REFUND({ message, businessId, customer }) {
    const orderId = message.trim();
    const order = await Order.findOne({
      businessId,
      customerId: customer._id,
      $or: [
        { orderId },
        {
          _id: mongoose.Types.ObjectId.isValid(orderId)
            ? new mongoose.Types.ObjectId(orderId)
            : new mongoose.Types.ObjectId(),
        },
      ],
    });
    if (!order) return { success: false, text: 'Order not found.' };
    if (order.paymentStatus !== 'Paid') {
      return { success: false, text: 'Order is not eligible for refund (not yet paid).' };
    }
    order.set('refundStatus', 'REQUESTED');
    await order.save();
    return { success: true, text: 'Refund request submitted. We will process it within 3–5 business days.' };
  }

  // ==========================================================================
  // BOOKING: DATE / TIME SAVING
  // ==========================================================================

  /**
   * SAVE_DATE
   * Validates YYYY-MM-DD format and that the date is strictly in the future.
   * Writes to both collectedData and context.
   */
  async SAVE_DATE({ session, message }) {
    const raw = String(message || '').trim();
    const dateObj = parseDateStr(raw);

    if (!dateObj) {
      return {
        success: false,
        text: 'Invalid date format. Please use DD/MM/YYYY (e.g., 25/12/2026).',
      };
    }

    // Must be a future date (strictly after today UTC midnight)
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);
    if (dateObj <= todayUTC) {
      return {
        success: false,
        text: 'Please choose a future date. Past or today\'s date is not allowed.',
      };
    }

    session.collectedData = session.collectedData || {};
    session.collectedData.date = raw;
    session.context = session.context || {};
    session.context.date = raw;
    session.markModified('collectedData');
    session.markModified('context');

    return { success: true };
  }

  /**
   * SAVE_TIME
   * Validates HH:mm 24-hour format.
   */
  async SAVE_TIME({ session, message }) {
    const raw = String(message || '').trim();
    // Accept both HH:mm and HHmm
    const normalized = raw.length === 4 && !raw.includes(':')
      ? `${raw.slice(0, 2)}:${raw.slice(2)}`
      : raw;

    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(normalized)) {
      return {
        success: false,
        text: 'Invalid time format. Please use HH:mm in 24-hour format (e.g., 14:30).',
      };
    }

    session.collectedData = session.collectedData || {};
    session.collectedData.time = normalized;
    session.context = session.context || {};
    session.context.time = normalized;
    session.markModified('collectedData');
    session.markModified('context');

    return { success: true };
  }

  async SAVE_SERVICE({ session, message }) {
    const service = String(message || '').trim();
    if (!service) return { success: false, text: 'Please enter a valid service name.' };

    session.collectedData = session.collectedData || {};
    session.collectedData.service = service;
    session.context = session.context || {};
    session.context.service = service;
    session.markModified('collectedData');
    session.markModified('context');

    return { success: true };
  }

  // ==========================================================================
  // BOOKING: AVAILABILITY CHECK
  // ==========================================================================

  /**
   * CHECK_AVAILABILITY
   * - Reads date + time from collectedData
   * - Checks if slot is taken for this businessId
   * - Returns success=false with alternatives if slot is taken
   */
  async CHECK_AVAILABILITY({ session, businessId }) {
    const data = session.collectedData || {};
    const { date: dateStr, time } = data;

    if (!dateStr || !time) {
      return { success: false, text: 'Missing date or time. Please provide both.' };
    }

    const dateObj = parseDateStr(dateStr);
    if (!dateObj) return { success: false, text: 'Invalid date stored in session.' };

    const { freeSlots, slots, isActiveDay, weekday } = await this.getFreeSlotsForDate(businessId, dateObj);

    if (!isActiveDay) {
      return {
        success: false,
        text: `We are not available on ${weekday}. Please choose another date.`,
      };
    }

    if (!slots.includes(time)) {
      return {
        success: false,
        text: `The selected time ${time} is outside working hours. Available slots on ${dateStr}:
${freeSlots.slice(0, 6).map((slot) => `- ${slot}`).join('\n') || 'No slots available.'}`,
      };
    }

    if (freeSlots.includes(time)) {
      return { success: true, text: `Slot ${time} on ${dateStr} is available.` };
    }

    const altText = freeSlots.length > 0
      ? `\n\nAvailable slots on ${dateStr}:\n${freeSlots.slice(0, 6).map((slot) => `- ${slot}`).join('\n')}`
      : `\n\nNo slots available on ${dateStr}. Please try a different date.`;

    return {
      success: false,
      text: `Sorry, ${time} on ${dateStr} is already booked.${altText}`,
    };
  }

  // ==========================================================================
  // BOOKING: BOOK_APPOINTMENT
  // ==========================================================================

  /**
   * BOOK_APPOINTMENT (production-level)
   * Full pipeline:
   * 1. Validate collectedData completeness
   * 2. Validate date is in the future
   * 3. Check slot availability
   * 4. Suggest alternatives if taken
   * 5. Create appointment (DB-level unique index as safety net)
   */
  async BOOK_APPOINTMENT({ session, businessId, customer }) {
    const data = session.collectedData || {};
    const { service, date: dateStr, time, name } = data;

    const business = await Business.findById(businessId).select('plan subscription.plan').lean();
    const plan = resolveBusinessPlan(business);

    const missing = [];
    if (!service) missing.push('service');
    if (!dateStr) missing.push('date (DD/MM/YYYY)');
    
    // For Basic/Free plans, time is optional and defaults to "TBD"
    let finalTime = time;
    if (!time) {
      if (plan === 'BASIC' || plan === 'FREE') {
        finalTime = 'TBD';
      } else {
        missing.push('time (HH:mm)');
      }
    }

    if (missing.length > 0) {
      return {
        success: false,
        text: `Please provide the following before booking: ${missing.join(', ')}.`,
      };
    }

    const dateObj = parseDateStr(dateStr);
    if (!dateObj) {
      return { success: false, text: 'Invalid date. Please use YYYY-MM-DD format.' };
    }

    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);
    if (dateObj <= todayUTC) {
      return {
        success: false,
        text: 'Booking date must be in the future. Please choose a valid future date.',
      };
    }

    if (finalTime !== 'TBD') {
      const { freeSlots, slots, isActiveDay, weekday } = await this.getFreeSlotsForDate(businessId, dateObj);

      if (!isActiveDay) {
        return {
          success: false,
          text: `Bookings are not available on ${weekday}. Please choose another date.`,
        };
      }

      if (!slots.includes(finalTime)) {
        return {
          success: false,
          text: `The selected time ${finalTime} is outside working hours. Available slots on ${dateStr}:
${freeSlots.slice(0, 6).map((slot) => `- ${slot}`).join('\n') || 'No slots available.'}`,
        };
      }

      if (!freeSlots.includes(finalTime)) {
        const altText = freeSlots.length > 0
          ? `\n\nTry one of these free slots on ${dateStr}:\n${freeSlots.slice(0, 6).map((slot) => `- ${slot}`).join('\n')}`
          : `\n\nNo other slots are available on ${dateStr}. Please try a different date.`;

        return {
          success: false,
          text: `${finalTime} on ${dateStr} is already booked.${altText}`,
        };
      }
    }

    let appointment;
    try {
      appointment = await AppointmentService.createAppointment(
        customer._id,
        dateObj,
        finalTime,
        null,
        businessId,
        service,
        null // created by bot
      );
    } catch (err) {
      if (err.code === 11000) {
        return {
          success: false,
          text: 'That slot was just taken. Please choose a different time.',
        };
      }
      throw err;
    }

    const clearFields = ['service', 'date', 'time'];
    clearFields.forEach((field) => {
      if (session.collectedData) delete session.collectedData[field];
      if (session.context) delete session.context[field];
    });
    session.markModified('collectedData');
    session.markModified('context');

    const displayName = name || customer.name || 'Customer';

    return {
      success: true,
      text:
        `Booking confirmed.\n\n` +
        `Name: ${displayName}\n` +
        `Service: ${service}\n` +
        `Date: ${dateStr}\n` +
        (finalTime !== 'TBD' ? `Time: ${finalTime}\n` : '') +
        `Booking ID: ${appointment._id}\n\n` +
        'We look forward to seeing you!',
    };
  }

  // ==========================================================================
  // BOOKING: CANCEL / RESCHEDULE / LIST
  // ==========================================================================

  async CANCEL_BOOKING({ message, businessId, customer }) {
    const appointmentId = message.trim();
    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return { success: false, text: 'Invalid booking ID. Please try again.' };
    }

    const appointment = await Appointment.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(appointmentId), businessId, customerId: customer._id },
      { status: 'CANCELLED' },
      { new: true }
    ).lean();

    if (!appointment) return { success: false, text: 'Booking not found. Please check your Booking ID.' };
    return { success: true, text: `✅ Your appointment (ID: ${appointmentId}) has been cancelled.` };
  }

  async RESCHEDULE_BOOKING({ session, businessId, customer }) {
    const { appointmentId, date: newDateStr, time: newTime } = session.collectedData || {};

    if (!appointmentId || !newDateStr || !newTime) {
      return { success: false, text: 'Please provide the booking ID, new date, and new time.' };
    }

    const newDateObj = parseDateStr(newDateStr);
    if (!newDateObj) return { success: false, text: 'Invalid new date. Please use YYYY-MM-DD.' };

    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);
    if (newDateObj <= todayUTC) {
      return { success: false, text: 'New date must be in the future.' };
    }

    const { freeSlots, slots, isActiveDay, weekday } = await this.getFreeSlotsForDate(businessId, newDateObj);

    if (!isActiveDay) {
      return { success: false, text: `Bookings are not available on ${weekday}. Please choose another date.` };
    }

    if (!slots.includes(newTime)) {
      return {
        success: false,
        text: `The selected time ${newTime} is outside working hours. Available slots on ${newDateStr}:
${freeSlots.slice(0, 6).map((slot) => `- ${slot}`).join('\n') || 'No slots available.'}`,
      };
    }

    if (!freeSlots.includes(newTime)) {
      return { success: false, text: `${newTime} on ${newDateStr} is already booked. Please choose another slot.` };
    }

    const appointment = await Appointment.findOneAndUpdate(
      { _id: appointmentId, businessId, customerId: customer._id },
      { date: newDateObj, time: newTime, status: 'RESCHEDULED' },
      { new: true }
    ).lean();

    if (!appointment) return { success: false, text: 'Booking not found.' };
    return { success: true, text: `Rescheduled to ${newDateStr} at ${newTime}.` };
  }

  async GET_BOOKINGS({ businessId, customer }) {
    if (!customer?._id) return { text: 'Could not identify customer.', success: false };

    const bookings = await Appointment.find({
      businessId,
      customerId: customer._id,
      status: { $in: ['BOOKED', 'RESCHEDULED'] },
    })
      .sort({ date: 1 })
      .limit(10)
      .lean();

    if (bookings.length === 0) return { text: 'You have no upcoming bookings.', success: true };

    const list = bookings
      .map(
        (b, i) =>
          `${i + 1}. ${b.service} – ${new Date(b.date).toISOString().split('T')[0]} at ${b.time} (${b.status})`
      )
      .join('\n');
    return { text: `📅 Your Upcoming Bookings:\n${list}`, success: true };
  }

  async SHOW_SERVICES({ businessId }) {
    // Stub: In future, fetch services from a configurable catalog per business.
    // For now return a helpful placeholder.
    return {
      text: 'Our services include: Haircut, Facial, Massage, Consultation. Please type the service you want to book.',
      success: true,
    };
  }

  // ==========================================================================
  // SUPPORT ACTIONS
  // ==========================================================================

  async START_SUPPORT({ session }) {
    session.mode = 'HUMAN';
    session.currentStep = 'support';
    session.markModified('mode');
    return {
      text: 'Switching you to a live operative. Please describe your issue in detail. An agent will be with you shortly. 🙏',
      success: true,
      nextStep: 'support'
    };
  }

  async CREATE_SUPPORT({ message, businessId, customer }) {
    const ticket = await SupportService.createTicket({
      businessId,
      customerId: customer._id,
      subject: 'Chatbot Support Request',
      message: message.trim(),
    });

    return {
      success: true,
      text: `🎫 Support protocol initiated. Your Ticket ID: ${ticket._id}. We will resolve this shortly.`,
    };
  }

  // ==========================================================================
  // FEEDBACK ACTION
  // ==========================================================================

  async CREATE_FEEDBACK({ session, message, businessId, customer }) {
    const ratingMatch = String(message).match(/[1-5]/);
    const rating = ratingMatch ? parseInt(ratingMatch[0], 10) : null;
    const productId = (session.collectedData || session.context || {}).productId;

    await FeedbackService.createFeedback({
      businessId,
      customerId: customer._id,
      rating,
      comment: message.trim(),
    });

    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
      const stats = await Feedback.aggregate([
        { $match: { productId: new mongoose.Types.ObjectId(productId) } },
        { $group: { _id: null, avg: { $avg: '$rating' }, total: { $sum: 1 } } },
      ]);
      if (stats.length > 0) {
        await Product.findByIdAndUpdate(productId, {
          rating: stats[0].avg,
          numReviews: stats[0].total,
        });
      }
    }

    return { success: true, text: '⭐ Feedback logged in our neural archives. Thank you for your contribution!' };
  }
}

export default new ChatbotActions();
