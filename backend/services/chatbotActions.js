import SupportTicket from '../models/SupportTicket.js';
import Feedback from '../models/Feedback.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import OrderService from './orderService.js';
import mongoose from 'mongoose';

class ChatbotActions {
  // --- USER DATA ACTIONS ---
  async CREATE_CUSTOMER({ phone, businessId }) {
    let customer = await Customer.findOne({ phone, businessId });
    if (!customer) {
      customer = await Customer.create({ phone, businessId, status: 'new' });
    }
    return { success: true, customer };
  }

  async SAVE_NAME({ session, message, customer }) {
    const name = message.trim();
    session.context.name = name;
    if (customer) {
      customer.name = name;
      await customer.save();
    }
    return { success: true };
  }

  async SAVE_USER_DETAILS({ session, message, customer }) {
    const age = parseInt(message);
    if (isNaN(age)) return { success: false, error: 'Please enter a valid age.' };
    
    session.context.age = age;
    if (customer) {
      customer.age = age;
      await customer.save();
    }
    return { success: true };
  }

  async SAVE_ADDRESS({ session, message, customer }) {
    const address = message.trim();
    session.context.address = address;
    if (customer) {
      customer.address = address;
      await customer.save();
    }
    return { success: true };
  }

  // --- PRODUCT ACTIONS ---
  async SHOW_PRODUCTS({ businessId }) {
    const products = await Product.find({ businessId, isActive: true }).lean();
    if (products.length === 0) {
      return { message: "Products will be added soon", success: true };
    }
    return { 
      type: 'product',
      products: products.map(p => ({
        id: p._id,
        name: p.name,
        price: p.offerPrice || p.mrp,
        image: p.image
      })),
      success: true 
    };
  }

  async SELECT_PRODUCT({ session, message, businessId }) {
    const product = await Product.findOne({ 
      businessId, 
      $or: [
        { name: new RegExp(message, 'i') },
        { _id: mongoose.Types.ObjectId.isValid(message) ? message : new mongoose.Types.ObjectId() }
      ]
    });
    if (!product) return { success: false, message: "Product not found." };
    
    session.context.productId = product._id;
    session.context.productName = product.name;
    session.context.productPrice = product.offerPrice || product.mrp;
    return { success: true, message: `Selected ${product.name}.` };
  }

  async SAVE_PRODUCT({ session, message }) {
    // Similar to SELECT_PRODUCT but simplified for direct save if ID is known
    session.context.productId = message;
    return { success: true };
  }

  async SAVE_QUANTITY({ session, message }) {
    const qty = parseInt(message);
    if (isNaN(qty) || qty < 1) return { success: false, message: "Please enter a valid quantity." };
    session.context.quantity = qty;
    return { success: true };
  }

  // --- ORDER ACTIONS ---
  async SHOW_CART({ session }) {
    const { productName, productPrice, quantity = 1 } = session.context;
    if (!productName) return { message: "Your cart is empty.", success: true };
    const total = (productPrice * quantity).toFixed(2);
    return { 
      message: `🛒 Shopping Cart:\nProduct: ${productName}\nPrice: Rs ${productPrice}\nQuantity: ${quantity}\nTotal: Rs ${total}`,
      success: true 
    };
  }

  async CREATE_ORDER({ session, businessId, customer }) {
    const { productId, productName, productPrice, quantity = 1, address } = session.context;
    
    const creation = await OrderService.createOrder({
      customerId: customer._id,
      productId,
      product: productName,
      amount: productPrice * quantity,
      quantity,
      address: address || customer.address,
      businessId,
      paymentType: 'COD'
    });

    session.context.currentOrderId = creation.order._id;
    return { 
      success: true, 
      message: `Confirmation: Order ${creation.order.orderId || creation.order._id} created. Status: CONFIRMED.`
    };
  }

  async ORDER_CONFIRMATION({ session, businessId }) {
    const orderId = session.context.currentOrderId;
    const order = await Order.findById(orderId);
    return { 
      message: `✅ Thank you! Your Order ID is ${order?.orderId || orderId}. We will notify you when it ships.`,
      success: true 
    };
  }

  async GET_ORDERS({ businessId, customer }) {
    const orders = await Order.find({ businessId, customerId: customer._id }).sort({ createdAt: -1 });
    if (orders.length === 0) return { message: "You have no orders yet.", success: true };
    
    const list = orders.map(o => `📦 ${o.orderId || o._id}: ${o.product} - Rs ${o.amount} (${o.orderStatus})`).join('\n');
    return { message: `Your Recent Orders:\n${list}`, success: true };
  }

  async TRACK_ORDER({ message, businessId, customer }) {
    const orderId = message.trim();
    const order = await Order.findOne({ 
      businessId, 
      customerId: customer._id,
      $or: [{ orderId }, { _id: mongoose.Types.ObjectId.isValid(orderId) ? orderId : new mongoose.Types.ObjectId() }]
    });

    if (!order) return { success: false, message: "Order not found." };
    return { message: `Status of Order ${order.orderId || order._id}: ${order.orderStatus}`, success: true };
  }

  // --- PAYMENT ---
  async PROCESS_PAYMENT({ session, businessId, customer }) {
    const { productId, productName, productPrice, quantity = 1, address } = session.context;
    
    const creation = await OrderService.createOrder({
      customerId: customer._id,
      productId,
      product: productName,
      amount: productPrice * quantity,
      quantity,
      address: address || customer.address,
      businessId,
      paymentType: 'ONLINE'
    });

    if (creation.payment?.error) {
      return { success: false, message: `Payment initialization failed: ${creation.payment.error}` };
    }

    return {
      type: 'payment',
      payment: {
        keyId: creation.payment.keyId,
        amount: Math.round(creation.order.amount * 100),
        currency: 'INR',
        razorpayOrderId: creation.payment.razorpayOrderId,
        internalOrderId: creation.order._id,
        customer: { name: customer.name, contact: customer.phone }
      },
      success: true
    };
  }

  async VERIFY_PAYMENT({ message, businessId }) {
    // Logic usually handled in webhook, but for chatbot simulation:
    const { razorpay_payment_id, razorpay_order_id } = message;
    const order = await Order.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id, businessId },
      { paymentStatus: 'Paid', razorpayPaymentId: razorpay_payment_id },
      { new: true }
    );
    return { success: true, message: `Payment verified for Order ${order?.orderId || order?._id}.` };
  }

  // --- ORDER MANAGEMENT ---
  async CANCEL_ORDER({ message, businessId, customer }) {
    const orderId = message.trim();
    const order = await Order.findOneAndUpdate(
      { businessId, customerId: customer._id, $or: [{ orderId }, { _id: mongoose.Types.ObjectId.isValid(orderId) ? orderId : new mongoose.Types.ObjectId() }] },
      { orderStatus: 'Cancelled', status: 'Cancelled' },
      { new: true }
    );
    if (!order) return { success: false, message: "Order not found." };
    return { success: true, message: "Order has been cancelled." };
  }

  async REQUEST_REFUND({ message, businessId, customer }) {
    const orderId = message.trim();
    const order = await Order.findOne({ businessId, customerId: customer._id, $or: [{ orderId }, { _id: mongoose.Types.ObjectId.isValid(orderId) ? orderId : new mongoose.Types.ObjectId() }] });
    
    if (!order) return { success: false, message: "Order not found." };
    if (order.paymentStatus !== 'Paid') return { success: false, message: "Order is not eligible for refund (not paid)." };

    order.paymentStatus = 'Refunded'; // Or use a separate field for requested
    // Custom field as requested: refundStatus = "REQUESTED"
    order.set('refundStatus', 'REQUESTED');
    await order.save();
    
    return { success: true, message: "Refund request has been submitted." };
  }

  // --- DATE & TIME ACTIONS ---
  async SAVE_DATE({ session, message }) {
    // Basic date validation YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(message)) {
      return { success: false, error: "Invalid date format. Please use YYYY-MM-DD" };
    }
    session.context.date = message;
    return { success: true };
  }

  async SAVE_TIME({ session, message }) {
    // Basic time validation HH:mm
    const timeRegex = /^([01]\d|2[0-3]):?([0-5]\d)$/;
    if (!timeRegex.test(message)) {
      return { success: false, error: "Invalid time format. Please use HH:mm" };
    }
    session.context.time = message;
    return { success: true };
  }

  async CHECK_AVAILABILITY({ session, businessId }) {
    const { date, time } = session.context;
    const existing = await Appointment.findOne({
      businessId,
      date: new Date(date),
      time,
      status: 'BOOKED'
    });

    if (existing) {
      return { 
        success: false, 
        message: "Sorry, this slot is already booked. Please choose another time or date." 
      };
    }
    return { success: true };
  }

  // --- BOOKING ACTIONS ---
  async BOOK_APPOINTMENT({ session, businessId, customer }) {
    const { service, date, time } = session.context;
    
    const appointment = new Appointment({
      customerId: customer._id,
      businessId,
      service,
      date: new Date(date),
      time,
      status: 'BOOKED'
    });

    await appointment.save();
    return { 
      success: true, 
      message: `Appointment confirmed for ${service} on ${date} at ${time}. Order ID: ${appointment._id}`
    };
  }

  async CANCEL_BOOKING({ session, message, businessId, customer }) {
    // Assume message is the Order ID or index
    const appointmentId = message.trim();
    const appointment = await Appointment.findOneAndUpdate(
      { _id: appointmentId, businessId, customerId: customer._id },
      { status: 'CANCELLED' },
      { new: true }
    );

    if (!appointment) return { success: false, message: "Appointment not found." };
    return { success: true, message: "Your appointment has been cancelled." };
  }

  async RESCHEDULE_BOOKING({ session, message, businessId, customer }) {
    // Logic to update an existing booking with new date/time from context
    const { appointmentId, newDate, newTime } = session.context;
    const appointment = await Appointment.findOneAndUpdate(
      { _id: appointmentId, businessId, customerId: customer._id },
      { date: new Date(newDate), time: newTime, status: 'RESCHEDULED' },
      { new: true }
    );

    if (!appointment) return { success: false, message: "Appointment not found." };
    return { success: true, message: `Re-scheduled to ${newDate} at ${newTime}.` };
  }

  async GET_BOOKINGS({ businessId, customer }) {
    const bookings = await Appointment.find({
      businessId,
      customerId: customer._id
    }).sort({ date: 1 });

    if (bookings.length === 0) return { message: "You have no active bookings.", success: true };

    const list = bookings.map((b, i) => `${i+1}. ${b.service} - ${b.date.toDateString()} at ${b.time} (${b.status})`).join('\n');
    return { message: `Your bookings:\n${list}`, success: true };
  }

  // --- SUPPORT ACTIONS ---
  async START_SUPPORT({ session }) {
    session.mode = 'HUMAN';
    return { 
      message: "Switching to support mode. An agent will be with you shortly. Please describe your issue.",
      success: true 
    };
  }

  async CREATE_SUPPORT({ session, message, businessId, customer }) {
    const ticket = new SupportTicket({
      businessId,
      customerId: customer._id,
      subject: "Chatbot Support Request",
      message: message,
      status: 'OPEN'
    });

    await ticket.save();
    return { 
      success: true, 
      message: `Ticket created successfully. Support ID: ${ticket._id}. We will get back to you.` 
    };
  }

  // --- FEEDBACK ACTION ---
  async CREATE_FEEDBACK({ session, message, businessId, customer }) {
    const ratingMatch = message.match(/[1-5]/);
    const rating = ratingMatch ? parseInt(ratingMatch[0]) : null;
    const productId = session.context.productId;
    
    const feedback = new Feedback({
      businessId,
      customerId: customer._id,
      productId,
      rating,
      comment: message,
      source: 'CHATBOT'
    });

    await feedback.save();

    // Update product average rating
    if (productId) {
      const product = await Product.findById(productId);
      if (product) {
        const stats = await Feedback.aggregate([
          { $match: { productId: new mongoose.Types.ObjectId(productId) } },
          { $group: { _id: null, avg: { $avg: "$rating" }, total: { $sum: 1 } } }
        ]);
        if (stats.length > 0) {
          product.rating = stats[0].avg;
          product.set('numReviews', stats[0].total);
          await product.save();
        }
      }
    }

    return { success: true, message: "Thank you for your feedback!" };
  }

  // --- SYSTEM ACTIONS ---
  async VALIDATE_INPUT({ session, message, type }) {
    // type can be 'email', 'phone', 'date', 'number'
    switch(type) {
      case 'number': 
        return { success: !isNaN(message) };
      case 'date':
        return { success: !isNaN(Date.parse(message)) };
      default:
        return { success: true };
    }
  }

  async UPDATE_CONTEXT({ session, key, value }) {
    session.context[key] = value;
    return { success: true };
  }
}

export default new ChatbotActions();
