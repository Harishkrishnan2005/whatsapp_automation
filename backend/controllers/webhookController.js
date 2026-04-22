import chatbotEngine from '../services/chatbotEngine.js';
import Business from '../models/Business.js';
import Customer from '../models/Customer.js';
import OrderService from '../services/orderService.js';
import PaymentService from '../services/paymentService.js';
import WhatsAppService from '../services/whatsappService.js';

class WebhookController {
  /**
   * Meta Webhook Verification (GET /webhook)
   */
  async verifyWebhook(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // In production, we should find the business by this token or use a global one
    // For now, let's use a simplified check or find any business that matches
    const business = await Business.findOne({ 'whatsappConfig.verifyToken': token });

    if (mode && token) {
      if (mode === 'subscribe' && (token === process.env.WHATSAPP_VERIFY_TOKEN || business)) {
        console.log('[Webhook] Webhook verified');
        return res.status(200).send(challenge);
      }
      return res.status(403).send('Verification failed');
    }
    return res.status(400).send('Invalid request');
  }

  /**
   * Main Webhook Handler (POST /webhook)
   * Supports both simulator (flat JSON) and real WhatsApp (nested Meta JSON)
   */
  async handleWebhook(req, res) {
    try {
      const { body } = req;

      // 1. Detect if it's a real WhatsApp webhook from Meta
      if (body.object === 'whatsapp_business_account') {
        return await this.handleRealWhatsAppWebhook(req, res);
      }

      // 2. Fallback to Simulator/Internal API logic
      return await this.handleSimulatorWebhook(req, res);
    } catch (error) {
      console.error('[Webhook] handleWebhook error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Handle real WhatsApp messages from Meta
   */
  async handleRealWhatsAppWebhook(req, res) {
    const { body } = req;
    
    // Respond quickly to Meta to avoid retries
    res.status(200).send('EVENT_RECEIVED');

    try {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messageObj = value?.messages?.[0];
      const metadata = value?.metadata;

      if (!messageObj) return;

      const phone = messageObj.from;
      const phoneNumberId = metadata?.phone_number_id;
      const messageText = messageObj.text?.body || '';

      // Resolve business by phoneNumberId
      const business = await Business.findOne({ 'whatsappConfig.phoneNumberId': phoneNumberId });
      if (!business) {
        console.error(`[Webhook] No business found for phoneNumberId: ${phoneNumberId}`);
        return;
      }

      const businessId = business._id;

      // Process through chatbot engine
      const botResult = await chatbotEngine.chatbotEngine({
        phone,
        message: messageText,
        businessId,
      });

      // Sync profile name onto the existing tenant-scoped customer record.
      await this.getOrCreateCustomer(phone, businessId, value?.contacts?.[0]?.profile?.name);

      // Send real response via WhatsApp Cloud API
      const responseText = botResult.response || botResult.text;
      if (responseText) {
        await WhatsAppService.sendTextMessage(businessId, phone, responseText);
      }

    } catch (error) {
      console.error('[Webhook] Error processing real WhatsApp message:', error);
    }
  }

  /**
   * Existing logic for simulator/internal testing
   */
  async handleSimulatorWebhook(req, res) {
    const { phone, message, businessId } = req.body;
    const normalizedPhone = String(phone || '').trim();
    const incomingText = typeof message === 'object' && message !== null
      ? message
      : String(message || '').trim();

    if (!normalizedPhone || (!incomingText && typeof incomingText !== 'object')) {
      return res.status(400).json({ message: 'phone and message are required' });
    }

    if (!businessId) {
      return res.status(400).json({ message: 'businessId is required' });
    }

    const resolvedBusinessId = businessId;

    const botResult = await chatbotEngine.chatbotEngine({
      phone: normalizedPhone,
      message: incomingText,
      businessId: resolvedBusinessId,
    });

    await this.getOrCreateCustomer(normalizedPhone, resolvedBusinessId);

    return res.json({
      response: botResult.response || botResult.text,
      text: botResult.text,
      products: botResult.products || [],
      type: botResult.type || 'text',
      payment: botResult.payment || null,
    });
  }

  async getOrCreateCustomer(phone, businessId, name = '') {
    let customer = await Customer.findOne({ phone, businessId });
    if (!customer) {
      customer = await Customer.create({ phone, businessId, name });
    } else if (name && !customer.name) {
      customer.name = name;
      await customer.save();
    }
    return customer;
  }

  /**
   * Razorpay & other methods remain mostly same but updated for multi-tenant
   */
  async verifyRazorpayPayment(req, res) {
    try {
      const { businessId, orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
      const order = await OrderService.verifyPayment({
        businessId,
        orderId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      });
      return res.json({ success: true, message: 'Payment verified', order });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  async handleRazorpayWebhook(req, res) {
    try {
      const signature = req.headers['x-razorpay-signature'];
      const rawBody = req.body?.toString();
      const isValid = await PaymentService.verifyWebhookSignature(rawBody, signature);
      if (!isValid) return res.status(400).json({ message: 'Invalid signature' });

      const payload = JSON.parse(rawBody);
      const paymentEntity = payload?.payload?.payment?.entity;
      const businessId = paymentEntity?.notes?.businessId;
      const razorpayOrderId = paymentEntity?.order_id;

      if (payload.event === 'payment.captured' && businessId && razorpayOrderId) {
        await OrderService.updatePaymentStatusByRazorpayOrder({
          businessId,
          razorpayOrderId,
          paymentStatus: 'Paid',
          orderStatus: 'Confirmed',
          razorpayPaymentId: paymentEntity.id,
        });
      }
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
}

export default new WebhookController();
