import Product from '../models/Product.js';
import Appointment from '../models/Appointment.js';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import ChatbotFlow from '../models/ChatbotFlow.js';
import OrderService from './orderService.js';
import mongoose from 'mongoose';

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
const objectIdRegex = /[a-fA-F0-9]{24}/;
const userOrderIdRegex = /ORD-[A-Z0-9-]+/i;

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

    return this.interpolate(flow?.reply || fallback, vars);
  }

  getCouponDiscountRate(couponCode) {
    const code = String(couponCode || '').trim();
    if (!code || code.toLowerCase() === 'no') return 0;
    return 0.05;
  }

  generateQueryId() {
    const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `QRY-${stamp}-${randomSuffix}`;
  }

  extractOrderId(input) {
    const text = String(input || '').trim();
    const customMatch = text.match(userOrderIdRegex);
    if (customMatch) return customMatch[0].toUpperCase();

    const match = text.match(objectIdRegex);
    return match ? match[0] : '';
  }

  buildOrderLookup(orderId) {
    const value = String(orderId || '').trim();
    if (!value) return null;

    const options = [{ orderId: value }];
    if (mongoose.Types.ObjectId.isValid(value)) {
      options.push({ _id: value });
    }

    return { $or: options };
  }

  async findOrderByReference({ businessId, orderId }) {
    const lookup = this.buildOrderLookup(orderId);
    if (!lookup) return null;

    return await Order.findOne({
      businessId,
      ...lookup,
    }).lean();
  }

  getTerminalOrderStatusMessage(order) {
    if (!order) return '';
    if (order.orderStatus === 'Cancelled') {
      return `Order ${order.orderId || order._id} is cancelled.`;
    }
    if (order.orderStatus === 'Returned') {
      return `Order ${order.orderId || order._id} is returned.`;
    }
    return '';
  }

  async getOrderPricingPreview({ session, businessId }) {
    const productId = session?.context?.productId;
    if (!productId) return null;

    const product = await Product.findOne({ _id: productId, businessId, isActive: true }).lean();
    if (!product) return null;

    const quantity = Math.max(1, Number(session?.context?.quantity || 1));
    const mrp = Number(product.mrp ?? 0);
    const offerPrice = Number(product.offerPrice ?? product.price ?? mrp);
    const offerPercentage = Number(product.offerPercentage ?? 0);
    const couponCode = String(session?.context?.couponCode || '').trim();
    const discountRate = this.getCouponDiscountRate(couponCode);
    const couponDiscount = Number((offerPrice * quantity * discountRate).toFixed(2));
    const finalPrice = Number(Math.max(0, (offerPrice * quantity) - couponDiscount).toFixed(2));

    return {
      product,
      quantity,
      mrp,
      offerPrice,
      offerPercentage,
      couponCode,
      couponDiscount,
      finalPrice,
    };
  }

  async showProducts({ businessId }) {
    const products = await Product.find({ businessId, isActive: true }).sort({ name: 1 }).lean();
    if (!products.length) {
      return {
        text: 'No products are available right now.',
        type: 'text',
        products: [],
      };
    }

    return {
      text: 'Here are our products:',
      type: 'product',
      products: products.map((product) => ({
        id: product._id,
        name: product.name,
        price: Number(product.offerPrice ?? product.price ?? product.mrp ?? 0),
        offerPrice: Number(product.offerPrice ?? product.price ?? product.mrp ?? 0),
        mrp: Number(product.mrp ?? 0),
        offerPercentage: Number(product.offerPercentage ?? 0),
        category: product.category,
        image: product.image,
        redirectUrl: product.redirectUrl,
      })),
    };
  }

  async saveName({ message, phone, businessId }) {
    const name = String(message || '').trim();
    if (!name) {
      return {
        text: 'Please enter a valid name.',
        type: 'text',
      };
    }

    await Customer.findOneAndUpdate(
      { phone, businessId },
      { $set: { name, phone, businessId } },
      { upsert: true, new: true }
    );

    return {
      text: `Thanks ${name}.`,
      type: 'text',
      contextDelta: { name },
    };
  }

  async saveProduct({ message, businessId }) {
    const candidate = String(message || '').trim();
    if (!candidate) {
      return {
        text: 'Please enter a valid product name.',
        type: 'text',
      };
    }

    const exactProduct = await Product.findOne({
      businessId,
      isActive: true,
      name: new RegExp(`^${escapeRegex(candidate)}$`, 'i'),
    }).lean();

    if (!exactProduct) {
      const suggestions = await Product.find({
        businessId,
        isActive: true,
        name: new RegExp(escapeRegex(candidate), 'i'),
      })
        .sort({ name: 1 })
        .limit(8)
        .lean();

      if (suggestions.length > 0) {
        return {
          text: 'I found these matching products. Please click Buy Now or type the exact product name to continue.',
          type: 'product',
          matched: false,
          products: suggestions.map((product) => ({
            id: product._id,
            name: product.name,
            price: Number(product.offerPrice ?? product.price ?? product.mrp ?? 0),
            offerPrice: Number(product.offerPrice ?? product.price ?? product.mrp ?? 0),
            mrp: Number(product.mrp ?? 0),
            offerPercentage: Number(product.offerPercentage ?? 0),
            category: product.category,
            image: product.image,
            redirectUrl: product.redirectUrl,
          })),
        };
      }

      return {
        text: 'Invalid product. Please enter an exact product name from the list.',
        type: 'text',
        matched: false,
      };
    }

    return {
      text: `You selected ${exactProduct.name}. Please share your delivery address.`,
      type: 'text',
      matched: true,
      contextDelta: {
        productId: exactProduct._id,
        productName: exactProduct.name,
        productPrice: Number(exactProduct.offerPrice ?? exactProduct.price ?? exactProduct.mrp ?? 0),
      },
    };
  }

  async createOrder({ session, phone, businessId, paymentType }) {
    const productId = session?.context?.productId;
    if (!productId) {
      return {
        text: await this.getSystemReply(
          businessId,
          'error_no_product_selected',
          'No product selected. Please select a product first.'
        ),
        type: 'text',
      };
    }

    const customer = await Customer.findOne({ phone, businessId }).lean();
    if (!customer) {
      return {
        text: await this.getSystemReply(
          businessId,
          'error_customer_not_found',
          'Customer not found for this business.'
        ),
        type: 'text',
      };
    }

    const preview = await this.getOrderPricingPreview({ session, businessId });
    if (!preview) {
      return {
        text: await this.getSystemReply(
          businessId,
          'error_order_amount',
          'Unable to calculate order amount. Please reselect the product.'
        ),
        type: 'text',
      };
    }

    let creation;
    try {
      creation = await OrderService.createOrder({
        customerId: customer._id,
        productId: preview.product._id,
        product: preview.product.name,
        amount: preview.finalPrice,
        price: preview.finalPrice,
        quantity: preview.quantity,
        mrp: preview.mrp,
        offerPrice: preview.offerPrice,
        offerPercentage: preview.offerPercentage,
        couponCode: preview.couponCode,
        couponDiscount: preview.couponDiscount,
        finalPrice: preview.finalPrice,
        category: preview.product.category || 'General',
        redirectUrl: preview.product.redirectUrl || '',
        paymentType,
        address: String(session?.context?.deliveryAddress || '').trim(),
        businessId,
      });
    } catch (error) {
      return {
        text: `Unable to create order for online payment right now. ${error.message || ''}`.trim(),
        type: 'text',
        success: false,
      };
    }

    const order = creation.order;
    const isOnline = creation.payment?.paymentType === 'ONLINE';

    if (isOnline) {
      if (creation.payment?.error) {
        return {
          text: [
            `Order created successfully. Order ID: ${order.orderId || order._id}`,
            `Amount: Rs ${Number(order.amount || 0).toFixed(2)}`,
            'Online payment could not be initialized right now.',
            `Reason: ${creation.payment.error}`,
            'Please verify Razorpay keys and restart backend, then try again.',
          ].join('\n'),
          type: 'text',
          success: false,
        };
      }

      return {
        text: await this.getSystemReply(
          businessId,
          'opening_online_payment',
          'Opening Razorpay secure checkout...',
          {
            orderId: order.orderId || order._id,
            amount: Number(order.amount || 0).toFixed(2),
          }
        ),
        type: 'payment',
        success: true,
        payment: {
          keyId: creation.payment.keyId,
          amount: Math.max(0, Math.round(Number(order.amount || 0) * 100)),
          currency: 'INR',
          razorpayOrderId: creation.payment.razorpayOrderId,
          internalOrderId: String(order.orderId || order._id),
          customer: {
            name: customer?.name || 'Customer',
            contact: customer?.phone || '',
          },
        },
        contextDelta: {
          currentOrderId: String(order.orderId || order._id),
          productId: null,
          productName: null,
          productPrice: null,
          deliveryAddress: null,
          quantity: null,
          couponCode: null,
        },
      };
    }

    return {
      text: await this.getSystemReply(
        businessId,
        'order_created_cod',
        [
          'Order confirmed successfully. Order ID: {{orderId}}',
          'Amount: Rs {{amount}}',
          'Payment method: Cash on Delivery',
        ].join('\n'),
        {
          orderId: order.orderId || order._id,
          amount: Number(order.amount || 0).toFixed(2),
        }
      ),
      type: 'text',
      success: true,
      contextDelta: {
        currentOrderId: String(order.orderId || order._id),
        productId: null,
        productName: null,
        productPrice: null,
        deliveryAddress: null,
        quantity: null,
        couponCode: null,
      },
    };
  }

  async processPayment({ message, session, businessId }) {
    const explicitOrderId = this.extractOrderId(message);
    const contextOrderId = String(session?.context?.currentOrderId || '');
    const orderId = explicitOrderId || contextOrderId;

    if (!orderId) {
      return {
        text: await this.getSystemReply(
          businessId,
          'ask_payment_order_id',
          'Please share a valid order ID to check payment status.'
        ),
        type: 'text',
      };
    }

    const order = await this.findOrderByReference({ businessId, orderId });
    if (!order) {
      return {
        text: await this.getSystemReply(
          businessId,
          'error_invalid_order_id',
          'Invalid order ID. Please check and try again.'
        ),
        type: 'text',
      };
    }

    const terminalStatusMessage = this.getTerminalOrderStatusMessage(order);
    if (terminalStatusMessage) {
      return {
        text: terminalStatusMessage,
        type: 'text',
      };
    }

    return {
      text: await this.getSystemReply(
        businessId,
        'order_status_summary',
        'Order {{orderId}}\nPayment Status: {{paymentStatus}}\nOrder Status: {{orderStatus}}',
        {
          orderId: order.orderId || order._id,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
        }
      ),
      type: 'text',
    };
  }

  async cancelOrder({ message, phone, businessId, orderId: explicitOrderId, reason: explicitReason = '' }) {
    const orderId = String(explicitOrderId || '').trim() || this.extractOrderId(message);
    if (!orderId) {
      return {
        text: await this.getSystemReply(
          businessId,
          'error_invalid_order_id',
          'Invalid order ID. Please send a valid order ID.'
        ),
        type: 'text',
      };
    }

    const customer = await Customer.findOne({ phone, businessId }).lean();
    if (!customer) {
      return {
        text: await this.getSystemReply(
          businessId,
          'error_customer_not_found',
          'Customer not found.'
        ),
        type: 'text',
      };
    }

    const existingOrder = await this.findOrderByReference({ businessId, orderId });
    if (existingOrder) {
      const terminalMessage = this.getTerminalOrderStatusMessage(existingOrder);
      if (terminalMessage) {
        return {
          text: terminalMessage,
          type: 'text',
        };
      }
    }

    try {
      const reason = String(explicitReason || '').trim() || String(message || '').trim();
      const order = await OrderService.cancelOrder({
        businessId,
        orderId,
        customerId: customer._id,
        reason,
      });

      const terminalMessage = this.getTerminalOrderStatusMessage(order);
      if (terminalMessage) {
        return {
          text: terminalMessage,
          type: 'text',
        };
      }

      return {
        text: await this.getSystemReply(
          businessId,
          'order_cancel_success',
          'Order {{orderId}} cancelled successfully.',
          { orderId: order.orderId || order._id }
        ),
        type: 'text',
      };
    } catch (error) {
      return {
        text: error.message || await this.getSystemReply(
          businessId,
          'error_cancel_order',
          'Unable to cancel order.'
        ),
        type: 'text',
      };
    }
  }

  async returnOrder({ message, phone, businessId, orderId: explicitOrderId, reason: explicitReason = '' }) {
    const orderId = String(explicitOrderId || '').trim() || this.extractOrderId(message);
    if (!orderId) {
      return {
        text: await this.getSystemReply(
          businessId,
          'error_invalid_order_id',
          'Invalid order ID. Please send a valid order ID.'
        ),
        type: 'text',
      };
    }

    const customer = await Customer.findOne({ phone, businessId }).lean();
    if (!customer) {
      return {
        text: await this.getSystemReply(
          businessId,
          'error_customer_not_found',
          'Customer not found.'
        ),
        type: 'text',
      };
    }

    const existingOrder = await this.findOrderByReference({ businessId, orderId });
    const terminalStatusMessage = this.getTerminalOrderStatusMessage(existingOrder);
    if (terminalStatusMessage) {
      return {
        text: terminalStatusMessage,
        type: 'text',
      };
    }

    try {
      const reason = String(explicitReason || '').trim() || String(message || '').trim();
      const order = await OrderService.requestReturn({
        businessId,
        orderId,
        customerId: customer._id,
        reason,
      });

      return {
        text: await this.getSystemReply(
          businessId,
          'order_return_requested',
          'Return requested for order {{orderId}}. Our team will contact you within 24hrs.',
          { orderId: order.orderId || order._id }
        ),
        type: 'text',
      };
    } catch (error) {
      return {
        text: error.message || await this.getSystemReply(
          businessId,
          'error_return_order',
          'Unable to process return request.'
        ),
        type: 'text',
      };
    }
  }

  async bookAppointment({ phone, message, businessId }) {
    const customer = await Customer.findOne({ phone, businessId }).lean();
    if (!customer) {
      return {
        text: await this.getSystemReply(
          businessId,
          'error_customer_not_found',
          'Customer not found for appointment booking.'
        ),
        type: 'text',
      };
    }

    const raw = String(message || '').trim();
    const lower = raw.toLowerCase();
    let date = null;

    if (lower.includes('today')) {
      date = new Date();
    } else if (lower.includes('tomorrow')) {
      date = new Date(Date.now() + 24 * 60 * 60 * 1000);
    } else {
      const parsedDate = new Date(raw);
      if (!Number.isNaN(parsedDate.getTime())) {
        date = parsedDate;
      }
    }

    if (!date) {
      return {
        text: await this.getSystemReply(
          businessId,
          'appointment_invalid_datetime',
          'Please provide a valid future appointment date and time. Example: tomorrow 5pm or 2026-05-20 10:00.'
        ),
        type: 'text',
      };
    }

    const now = new Date();
    if (date.getTime() <= now.getTime()) {
      return {
        text: await this.getSystemReply(
          businessId,
          'appointment_past_not_allowed',
          'Appointments must be scheduled for a future date and time. Please choose a later date.'
        ),
        type: 'text',
      };
    }

    let timeSlot = '10:00';
    const timeMatch = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      const hour = Number(timeMatch[1]);
      const minute = Number(timeMatch[2] || '00');
      const ampm = (timeMatch[3] || '').toLowerCase();
      let hour24 = hour;
      if (ampm === 'pm' && hour < 12) hour24 = hour + 12;
      if (ampm === 'am' && hour === 12) hour24 = 0;
      timeSlot = `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }

    await Appointment.create({
      customerId: customer._id,
      date,
      timeSlot,
      status: 'Pending',
      businessId,
    });

    return {
      text: await this.getSystemReply(
        businessId,
        'appointment_booked_success',
        'Appointment booked for {{date}} at {{time}}.',
        { date: date.toDateString(), time: timeSlot }
      ),
      type: 'text',
    };
  }

  async createFeedback({ message, businessId }) {
    const input = String(message || '').trim();
    const hasQueryId = /^qry-[a-z0-9-]+$/i.test(input);
    const queryId = hasQueryId ? input.toUpperCase() : this.generateQueryId();

    return {
      text: hasQueryId
        ? await this.getSystemReply(
            businessId,
            'feedback_existing_query',
            'Your query {{queryId}} is under review. Our team will rectify it within 24hrs.',
            { queryId }
          )
        : await this.getSystemReply(
            businessId,
            'feedback_new_query',
            'Thanks for your message. Our team will rectify it within 24hrs. Your query ID is {{queryId}}.',
            { queryId }
          ),
      type: 'text',
    };
  }

  async startSupport({ session, message, businessId }) {
    const orderId = this.extractOrderId(message);
    if (!orderId) {
      return {
        success: false,
        text: await this.getSystemReply(
          businessId,
          'support_invalid_order_id',
          'Invalid order ID. Please provide a valid order ID for support.'
        ),
      };
    }

    const order = await this.findOrderByReference({ businessId, orderId });

    if (!order) {
      return {
        success: false,
        text: await this.getSystemReply(
          businessId,
          'support_order_not_found',
          'No order found with that ID. Please check and try again.'
        ),
      };
    }

    const terminalStatusMessage = this.getTerminalOrderStatusMessage(order);
    if (terminalStatusMessage) {
      return {
        success: false,
        text: terminalStatusMessage,
      };
    }

    return {
      success: true,
      text: await this.getSystemReply(
        businessId,
        'support_order_found',
        'Order {{orderId}} found. Please share your feedback and mention the product name ({{productName}}).',
        {
          orderId: order.orderId || order._id,
          productName: order.product,
        }
      ),
      contextDelta: {
        supportOrderId: order.orderId || String(order._id),
        supportProductName: order.product,
      },
    };
  }

  async createSupport({ session, message, businessId }) {
    const feedbackText = String(message || '').trim();
    if (!feedbackText) {
      return {
        text: await this.getSystemReply(
          businessId,
          'support_feedback_required',
          'Please enter your feedback so we can help you.'
        ),
        type: 'text',
      };
    }

    const ticketId = this.generateQueryId();
    const productName = String(session?.context?.supportProductName || 'your product');

    return {
      text: await this.getSystemReply(
        businessId,
        'support_feedback_thanks',
        'Thanks for your feedback on {{productName}}. Support request ID: {{ticketId}}. Our team will review and get back to you shortly.',
        { productName, ticketId }
      ),
      type: 'text',
    };
  }

  async executeAction(action, payload) {
    switch (action) {
      case 'SHOW_PRODUCTS':
        return this.showProducts(payload);
      case 'SAVE_NAME':
        return this.saveName(payload);
      case 'SAVE_PRODUCT':
        return this.saveProduct(payload);
      case 'CREATE_ORDER':
        return this.createOrder(payload);
      case 'PROCESS_PAYMENT':
        return this.processPayment(payload);
      case 'CANCEL_ORDER':
        return this.cancelOrder(payload);
      case 'RETURN_ORDER':
        return this.returnOrder(payload);
      case 'BOOK_APPOINTMENT':
        return this.bookAppointment(payload);
      case 'CREATE_FEEDBACK':
        return this.createFeedback(payload);
      case 'START_SUPPORT':
        return this.startSupport(payload);
      case 'CREATE_SUPPORT':
        return this.createSupport(payload);
      case 'NONE':
      default:
        return { text: '', type: 'text' };
    }
  }
}

export default new ActionHandler();
