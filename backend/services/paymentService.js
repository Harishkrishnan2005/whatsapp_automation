import crypto from 'crypto';
import Razorpay from 'razorpay';

class PaymentService {
  constructor() {
    this.client = null;
    this.clientKeyId = '';
    this.clientKeySecret = '';
  }

  getConfig() {
    return {
      keyId: process.env.RAZORPAY_KEY_ID || '',
      keySecret: process.env.RAZORPAY_KEY_SECRET || '',
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    };
  }

  ensureClient() {
    const { keyId, keySecret } = this.getConfig();
    if (!keyId || !keySecret) {
      throw new Error('Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    }

    const configChanged = this.clientKeyId !== keyId || this.clientKeySecret !== keySecret;
    if (!this.client || configChanged) {
      this.client = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
      this.clientKeyId = keyId;
      this.clientKeySecret = keySecret;
    }
  }

  toPaise(amount) {
    return Math.max(0, Math.round(Number(amount || 0) * 100));
  }

  async createRazorpayOrder({ amount, receipt, notes = {} }) {
    this.ensureClient();

    const order = await this.client.orders.create({
      amount: this.toPaise(amount),
      currency: 'INR',
      receipt,
      notes,
    });

    return order;
  }

  async createPaymentLink({ amount, customer = {}, notes = {} }) {
    this.ensureClient();

    const payload = {
      amount: this.toPaise(amount),
      currency: 'INR',
      description: 'WhatsApp Automation Order Payment',
      accept_partial: false,
      customer: {
        name: customer.name || 'Customer',
        contact: customer.contact || undefined,
      },
      notify: { sms: false, email: false },
      notes,
    };

    const paymentLink = await this.client.paymentLink.create(payload);
    return paymentLink;
  }

  verifyPayment({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    const { keySecret } = this.getConfig();
    if (!keySecret) {
      throw new Error('Razorpay key secret missing.');
    }

    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    return generatedSignature === razorpaySignature;
  }

  verifyWebhookSignature(rawBody, signature) {
    const { webhookSecret } = this.getConfig();
    if (!webhookSecret) {
      throw new Error('Razorpay webhook secret missing.');
    }

    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    return expected === signature;
  }

  async refundPayment(paymentId, amount) {
    this.ensureClient();

    const refund = await this.client.payments.refund(paymentId, {
      amount: this.toPaise(amount),
    });

    return refund;
  }

  getPublicConfig() {
    const { keyId } = this.getConfig();
    return {
      keyId,
    };
  }
}

export default new PaymentService();
