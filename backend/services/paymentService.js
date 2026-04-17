import crypto from 'crypto';
import Razorpay from 'razorpay';
import Business from '../models/Business.js';

class PaymentService {
  constructor() {
    this.clients = new Map(); // Cache clients by businessId
  }

  async getConfig(businessId) {
    if (!businessId) {
      return {
        keyId: process.env.RAZORPAY_KEY_ID || '',
        keySecret: process.env.RAZORPAY_KEY_SECRET || '',
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
      };
    }

    const business = await Business.findById(businessId).select('razorpayConfig').lean();
    const config = business?.razorpayConfig || {};

    return {
      keyId: config.keyId || process.env.RAZORPAY_KEY_ID || '',
      keySecret: config.keySecret || process.env.RAZORPAY_KEY_SECRET || '',
      webhookSecret: config.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || '',
    };
  }

  async getClient(businessId) {
    const { keyId, keySecret } = await this.getConfig(businessId);
    if (!keyId || !keySecret) {
      throw new Error('Razorpay is not configured for this business.');
    }

    const cacheKey = `${businessId || 'global'}_${keyId}`;
    if (!this.clients.has(cacheKey)) {
      this.clients.set(cacheKey, new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      }));
    }

    return this.clients.get(cacheKey);
  }

  toPaise(amount) {
    return Math.max(0, Math.round(Number(amount || 0) * 100));
  }

  async createRazorpayOrder({ businessId, amount, receipt, notes = {} }) {
    const client = await this.getClient(businessId);

    const order = await client.orders.create({
      amount: this.toPaise(amount),
      currency: 'INR',
      receipt,
      notes: { ...notes, businessId: String(businessId) },
    });

    return order;
  }

  async createPaymentLink({ businessId, amount, customer = {}, notes = {} }) {
    const client = await this.getClient(businessId);

    const payload = {
      amount: this.toPaise(amount),
      currency: 'INR',
      description: 'Order Payment',
      customer: {
        name: customer.name || 'Customer',
        contact: customer.contact || undefined,
      },
      notify: { sms: true, email: true },
      notes: { ...notes, businessId: String(businessId) },
    };

    return await client.paymentLink.create(payload);
  }

  async verifyPayment({ businessId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    const { keySecret } = await this.getConfig(businessId);
    if (!keySecret) throw new Error('Razorpay key secret missing.');

    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    return generatedSignature === razorpaySignature;
  }

  async verifyWebhookSignature({ businessId, rawBody, signature }) {
    const { webhookSecret } = await this.getConfig(businessId);
    if (!webhookSecret) throw new Error('Razorpay webhook secret missing.');

    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    return expected === signature;
  }

  async refundPayment({ businessId, paymentId, amount }) {
    const client = await this.getClient(businessId);
    return await client.payments.refund(paymentId, {
      amount: this.toPaise(amount),
    });
  }

  async getPublicConfig(businessId) {
    const { keyId } = await this.getConfig(businessId);
    return { keyId };
  }
}

export default new PaymentService();

