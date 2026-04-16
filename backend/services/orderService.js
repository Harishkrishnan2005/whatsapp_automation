import mongoose from 'mongoose';
import crypto from 'crypto';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import User from '../models/User.js';
import CustomerStatusService from './customerStatusService.js';
import PaymentService from './paymentService.js';
import buildTenantScope from '../utils/tenantScope.js';
import { buildCreatedAtFilter, buildSearchRegex } from '../utils/queryFilters.js';

const normalizePaymentType = (paymentType) => {
  if (String(paymentType || '').toUpperCase() === 'ONLINE' || String(paymentType || '').toUpperCase() === 'UPI') {
    return 'ONLINE';
  }
  return 'COD';
};

const mapLegacyPaymentMethod = (paymentType) => (paymentType === 'ONLINE' ? 'UPI' : 'Cash');
const mapLegacyStatus = (orderStatus) => orderStatus;

class OrderService {
  generateOrderId() {
    const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    const randomPart = crypto.randomBytes(6).toString('hex').toUpperCase();
    return `ORD-${stamp}-${randomPart}`;
  }

  buildOrderLookup(orderReference) {
    const value = String(orderReference || '').trim();
    if (!value) return null;

    const options = [{ orderId: value }];
    if (mongoose.Types.ObjectId.isValid(value)) {
      options.push({ _id: value });
    }

    return { $or: options };
  }

  async getOrders(businessId, page = 1, limit = 10, filters = {}, options = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 10));
    const skip = (safePage - 1) * safeLimit;
    const query = { ...buildTenantScope(businessId) };
    const createdAt = buildCreatedAtFilter(filters);
    const searchRegex = buildSearchRegex(filters.search);

    if (createdAt) {
      query.createdAt = createdAt;
    }

    if (filters.orderStatus) {
      query.orderStatus = filters.orderStatus;
    }

    if (filters.paymentStatus) {
      query.paymentStatus = filters.paymentStatus;
    }

    if (filters.paymentType) {
      query.paymentType = normalizePaymentType(filters.paymentType);
    }

    if (searchRegex) {
      query.$or = [
        { product: searchRegex },
        { orderId: searchRegex },
        { category: searchRegex },
      ];
    }

    if (options.assignedTo) {
      query.assignedTo = options.assignedTo;
    }

    const orders = await Order.find(query)
      .skip(skip)
      .limit(safeLimit)
      .sort({ createdAt: -1 })
      .lean();

    const customerIds = [
      ...new Set(
        orders
          .map((order) => order?.customerId)
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
          .map((id) => String(id))
      ),
    ];

    const customers = customerIds.length
      ? await Customer.find({ _id: { $in: customerIds }, ...buildTenantScope(businessId) }, { name: 1, phone: 1 }).lean()
      : [];
    const customerMap = new Map(customers.map((customer) => [String(customer._id), customer]));

    const staffIds = [
      ...new Set(
        orders
          .map((order) => order?.assignedTo)
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
          .map((id) => String(id))
      ),
    ];
    const staffRows = staffIds.length
      ? await User.find({ _id: { $in: staffIds } }, { name: 1, email: 1 }).lean()
      : [];
    const staffMap = new Map(staffRows.map((staff) => [String(staff._id), staff]));

    const hydratedOrders = orders.map((order) => {
      const customer = customerMap.get(String(order.customerId));
      return {
        ...order,
        customerId: customer
          ? { _id: customer._id, name: customer.name, phone: customer.phone }
          : null,
        assignedTo: order.assignedTo
          ? (
              staffMap.get(String(order.assignedTo))
                ? { _id: order.assignedTo, ...staffMap.get(String(order.assignedTo)) }
                : { _id: order.assignedTo }
            )
          : null,
      };
    });

    const total = await Order.countDocuments(query);
    return { orders: hydratedOrders, total, page: safePage, limit: safeLimit };
  }

  async createOrder(orderData) {
    const {
      businessId,
      customerId,
      productId,
      product,
      amount,
      price,
      quantity = 1,
      category,
      redirectUrl,
      paymentType,
      address = '',
      couponCode = '',
      couponDiscount = 0,
      mrp = 0,
      offerPrice = 0,
      offerPercentage = 0,
      finalPrice,
    } = orderData;

    if (!businessId) throw new Error('businessId is required');
    if (!customerId) throw new Error('customerId is required');

    const normalizedPaymentType = normalizePaymentType(paymentType || orderData.paymentMethod);
    const effectiveAmount = Number(finalPrice || amount || price || 0);

    const orderPayload = {
      orderId: this.generateOrderId(),
      businessId,
      customerId,
      productId: productId || null,
      product,
      amount: effectiveAmount,
      price: Number(price || effectiveAmount),
      quantity: Math.max(1, Number(quantity || 1)),
      category: category || 'General',
      redirectUrl: redirectUrl || '',
      paymentType: normalizedPaymentType,
      paymentMethod: mapLegacyPaymentMethod(normalizedPaymentType),
      paymentStatus: normalizedPaymentType === 'ONLINE' ? 'Pending' : 'Pending',
      orderStatus: normalizedPaymentType === 'ONLINE' ? 'Pending' : 'Confirmed',
      status: normalizedPaymentType === 'ONLINE' ? 'Pending' : 'Confirmed',
      address,
      couponCode,
      couponDiscount: Number(couponDiscount || 0),
      mrp: Number(mrp || 0),
      offerPrice: Number(offerPrice || 0),
      offerPercentage: Number(offerPercentage || 0),
      finalPrice: Number(finalPrice || effectiveAmount),
    };

    const order = await Order.create(orderPayload);

    let paymentLink = '';
    let paymentError = '';

    if (normalizedPaymentType === 'ONLINE') {
      try {
        const razorpayOrder = await PaymentService.createRazorpayOrder({
          amount: order.amount,
          receipt: `ord_${String(order._id).slice(-10)}`,
          notes: {
            businessId: String(businessId),
            orderId: String(order._id),
          },
        });

        let linkResponse = null;
        try {
          const customer = await Customer.findById(customerId).lean();
          linkResponse = await PaymentService.createPaymentLink({
            amount: order.amount,
            customer: {
              name: customer?.name || 'Customer',
              contact: customer?.phone,
            },
            notes: {
              businessId: String(businessId),
              orderId: String(order._id),
              razorpayOrderId: razorpayOrder.id,
            },
          });
        } catch (error) {
          linkResponse = null;
        }

        paymentLink = linkResponse?.short_url || '';

        await Order.findByIdAndUpdate(order._id, {
          razorpayOrderId: razorpayOrder.id,
          paymentLink,
        });

        order.razorpayOrderId = razorpayOrder.id;
        order.paymentLink = paymentLink;
      } catch (error) {
        paymentError = error?.error?.description || error?.message || 'Unable to initialize Razorpay payment.';
        console.error('[OrderService] Razorpay init failed:', paymentError);
      }
    }

    await CustomerStatusService.syncStatusForCustomer(order.customerId);

    return {
      order,
      payment: normalizedPaymentType === 'ONLINE'
        ? {
            paymentType: 'ONLINE',
            paymentLink: order.paymentLink,
            razorpayOrderId: order.razorpayOrderId,
            keyId: PaymentService.getPublicConfig().keyId,
            error: paymentError,
          }
        : {
            paymentType: 'COD',
            paymentLink: '',
            razorpayOrderId: '',
            keyId: '',
          },
    };
  }

  async verifyPayment({ businessId, orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    const query = { businessId };

    if (orderId) {
      const lookup = this.buildOrderLookup(orderId);
      if (!lookup) {
        throw new Error('orderId or razorpayOrderId is required');
      }
      query.$or = lookup.$or;
    } else if (razorpayOrderId) {
      query.razorpayOrderId = razorpayOrderId;
    } else {
      throw new Error('orderId or razorpayOrderId is required');
    }

    const order = await Order.findOne(query);
    if (!order) {
      throw new Error('Order not found');
    }

    const valid = PaymentService.verifyPayment({
      razorpayOrderId: razorpayOrderId || order.razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!valid) {
      await Order.findByIdAndUpdate(order._id, {
        paymentStatus: 'Failed',
        orderStatus: 'Pending',
        status: 'Pending',
      });
      throw new Error('Payment signature verification failed');
    }

    const updated = await Order.findByIdAndUpdate(
      order._id,
      {
        paymentStatus: 'Paid',
        orderStatus: 'Confirmed',
        status: 'Confirmed',
        razorpayPaymentId,
        razorpaySignature,
      },
      { new: true }
    );

    return updated;
  }

  async markPaymentFailed({ businessId, razorpayOrderId }) {
    const updated = await Order.findOneAndUpdate(
      { businessId, razorpayOrderId },
      { paymentStatus: 'Failed' },
      { new: true }
    );
    return updated;
  }

  async updatePaymentStatusByRazorpayOrder({
    businessId,
    razorpayOrderId,
    paymentStatus,
    orderStatus = null,
    razorpayPaymentId = '',
  }) {
    const updatePayload = {
      paymentStatus,
    };

    if (orderStatus) {
      updatePayload.orderStatus = orderStatus;
      updatePayload.status = orderStatus;
    }

    if (razorpayPaymentId) {
      updatePayload.razorpayPaymentId = razorpayPaymentId;
    }

    return await Order.findOneAndUpdate(
      { businessId, razorpayOrderId },
      updatePayload,
      { new: true }
    );
  }

  async cancelOrder({ businessId, orderId, customerId = null, reason = '' }) {
    const lookup = this.buildOrderLookup(orderId);
    if (!lookup) throw new Error('Invalid order ID');

    const query = { ...lookup, businessId };
    if (customerId) query.customerId = customerId;

    const order = await Order.findOne(query);
    if (!order) throw new Error('Invalid order ID');

    if (['Cancelled', 'Returned'].includes(order.orderStatus)) {
      return order;
    }

    if (order.orderStatus === 'Delivered') {
      throw new Error('Order is already delivered. You can only return this product.');
    }

    const updates = {
      orderStatus: 'Cancelled',
      status: 'Cancelled',
      cancellationReason: reason,
    };

    const updated = await Order.findByIdAndUpdate(order._id, updates, { new: true });
    return updated;
  }

  async requestReturn({ businessId, orderId, customerId = null, reason = '' }) {
    const lookup = this.buildOrderLookup(orderId);
    if (!lookup) throw new Error('Invalid order ID');

    const query = { ...lookup, businessId };
    if (customerId) query.customerId = customerId;

    const order = await Order.findOne(query);
    if (!order) throw new Error('Invalid order ID');

    if (order.orderStatus === 'Cancelled') {
      throw new Error(`Order ${order.orderId || order._id} is cancelled.`);
    }

    if (order.orderStatus === 'Returned') {
      throw new Error(`Order ${order.orderId || order._id} is returned.`);
    }

    if (order.orderStatus !== 'Delivered') {
      throw new Error('Return allowed only for delivered orders');
    }

    const updated = await Order.findByIdAndUpdate(
      order._id,
      {
        orderStatus: 'Return Requested',
        status: 'Return Requested',
        returnReason: reason,
        returnRequestedAt: new Date(),
      },
      { new: true }
    );

    return updated;
  }

  async approveReturn({ businessId, orderId, refundOnline = true }) {
    const lookup = this.buildOrderLookup(orderId);
    if (!lookup) throw new Error('Invalid order ID');

    const order = await Order.findOne({ ...lookup, businessId });
    if (!order) throw new Error('Order not found');

    if (!['Return Requested', 'Delivered'].includes(order.orderStatus)) {
      throw new Error('Return approval not allowed for current order state');
    }

    const updatePayload = {
      orderStatus: 'Returned',
      status: 'Returned',
      returnedAt: new Date(),
    };

    if (refundOnline && order.paymentType === 'ONLINE' && order.paymentStatus === 'Paid' && order.razorpayPaymentId) {
      const refund = await PaymentService.refundPayment(order.razorpayPaymentId, order.amount);
      updatePayload.paymentStatus = 'Refunded';
      updatePayload.razorpayRefundId = refund.id;
    }

    return await Order.findByIdAndUpdate(order._id, updatePayload, { new: true });
  }

  async updateOrderStatus(businessId, id, orderStatus) {
    const validOrderStatuses = ['Pending', 'Confirmed', 'Cancelled', 'Delivered', 'Return Requested', 'Returned'];
    if (!validOrderStatuses.includes(orderStatus)) {
      throw new Error('Invalid order status');
    }

    const existingOrder = await Order.findOne({ _id: id, ...buildTenantScope(businessId) }).lean();
    if (!existingOrder) {
      return null;
    }

    return await Order.findOneAndUpdate(
      { _id: id, ...buildTenantScope(businessId) },
      { orderStatus, status: mapLegacyStatus(orderStatus) },
      { new: true }
    );
  }

  async updatePaymentStatus(businessId, id, paymentStatus) {
    const validPaymentStatuses = ['Pending', 'Paid', 'Failed', 'Refunded'];
    if (!validPaymentStatuses.includes(paymentStatus)) {
      throw new Error('Invalid payment status');
    }

    const existingOrder = await Order.findOne({ _id: id, ...buildTenantScope(businessId) }).lean();

    if (!existingOrder) {
      return null;
    }

    const updatePayload = { paymentStatus };
    if (paymentStatus === 'Paid' && existingOrder.orderStatus === 'Pending') {
      updatePayload.orderStatus = 'Confirmed';
      updatePayload.status = 'Confirmed';
    }

    if (paymentStatus === 'Failed' && existingOrder.orderStatus === 'Pending') {
      updatePayload.status = 'Pending';
    }

    return await Order.findOneAndUpdate(
      { _id: id, ...buildTenantScope(businessId) },
      updatePayload,
      { new: true }
    );
  }

  async getOrderById(businessId, id) {
    return await Order.findOne({ _id: id, ...buildTenantScope(businessId) }).lean();
  }

  async assignOrder(businessId, orderId, staffId) {
    return await Order.findOneAndUpdate(
      { _id: orderId, ...buildTenantScope(businessId) },
      { assignedTo: staffId },
      { new: true }
    );
  }
}

export default new OrderService();
