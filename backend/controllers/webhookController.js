import ChatbotEngine from '../services/chatbotEngine.js';
import SessionService from '../services/sessionService.js';
import Business from '../models/Business.js';
import Customer from '../models/Customer.js';
import Message from '../models/Message.js';
import OrderService from '../services/orderService.js';
import PaymentService from '../services/paymentService.js';

/**
 * Production-Grade Webhook Controller
 * 
 * Features:
 * - Session-aware message handling
 * - Message logging for audit trail
 * - Error handling with graceful fallbacks
 * - Business validation and auto-bootstrap
 * - Session metadata in response (optional)
 */

class WebhookController {
  /**
   * Resolve business ID with auto-bootstrap fallback
   * 
   * @private
   */
  async resolveBusinessId(inputBusinessId) {
    if (inputBusinessId) {
      return inputBusinessId;
    }

    const business = await Business.findOne().select('_id').lean();
    if (business?._id) {
      return business._id;
    }

    // Auto-bootstrap: Create default business for simulator/webhook usage
    const created = await Business.create({
      name: 'Default Business',
      email: `default-business-${Date.now()}@local.test`,
      plan: 'Free',
    });

    console.log(`[WebhookController] Auto-bootstrapped default business: ${created._id}`);
    return created._id;
  }

  /**
   * Main webhook handler
   * 
   * Request body:
   * {
   *   phone: string (required),
   *   message: string (required),
   *   businessId: string (optional)
   * }
   * 
   * Response:
   * {
   *   response: string,
   *   text: string,
   *   products: Array,
   *   type: 'text' | 'product',
   *   sessionInfo: Object (optional, for debugging)
   * }
   * 
   * @example
   *   POST /webhook
   *   {
   *     "phone": "9876543210",
   *     "message": "show products",
   *     "businessId": "507f1f77bcf86cd799439011"
   *   }
   */
  async handleWebhook(req, res) {
    const startTime = Date.now();

    try {
      // ==================
      // STEP 1: Validate input
      // ==================
      const { phone, message, businessId, includeSessionInfo } = req.body;

      const normalizedPhone = String(phone || '').trim();
      const incomingText = String(message || '').trim();

      if (!normalizedPhone || !incomingText) {
        return res.status(400).json({
          message: 'phone and message are required',
          example: {
            phone: '9876543210',
            message: 'show products',
            businessId: 'optional-business-id',
          },
        });
      }

      // ==================
      // STEP 2: Resolve business ID
      // ==================
      const resolvedBusinessId = await this.resolveBusinessId(businessId);

      // ==================
      // STEP 3: Ensure customer exists
      // ==================
      let customer = await Customer.findOne({
        phone: normalizedPhone,
        businessId: resolvedBusinessId,
      });

      if (!customer) {
        customer = await Customer.create({
          phone: normalizedPhone,
          businessId: resolvedBusinessId,
          name: '',
        });

        console.log(`[WebhookController] Customer created: ${normalizedPhone}`);
      }

      // ==================
      // STEP 4: Log incoming message
      // ==================
      await Message.create({
        customerId: customer._id,
        message: incomingText,
        type: 'incoming',
        senderType: 'customer',
        businessId: resolvedBusinessId,
      });

      // ==================
      // STEP 5: Process through chatbot engine
      // ==================
      const botResult = await ChatbotEngine.chatbotEngine({
        phone: normalizedPhone,
        message: incomingText,
        businessId: resolvedBusinessId,
      });

      // ==================
      // STEP 6: Log outgoing message
      // ==================
      await Message.create({
        customerId: customer._id,
        message: botResult.response || botResult.text,
        type: 'outgoing',
        senderType: 'chatbot',
        products: Array.isArray(botResult.products) ? botResult.products : [],
        businessId: resolvedBusinessId,
      });

      // ==================
      // STEP 7: Build response
      // ==================
      const responsePayload = {
        response: botResult.response || botResult.text,
        text: botResult.text,
        products: botResult.products || [],
        type: botResult.type || 'text',
        payment: botResult.payment || null,
      };

      // Optional: Include session info for debugging (enable when includeSessionInfo=true)
      if (includeSessionInfo) {
        try {
          const session = await SessionService.getOrCreateSession(
            normalizedPhone,
            resolvedBusinessId
          );
          responsePayload.sessionInfo = SessionService.getSessionMetadata(session);
        } catch (err) {
          console.error('[WebhookController] Failed to get session info:', err.message);
          // Don't fail response if session info fails
        }
      }

      const processingTime = Date.now() - startTime;
      console.log(`[WebhookController] Processed in ${processingTime}ms: ${normalizedPhone}`);

      return res.json(responsePayload);
    } catch (error) {
      const processingTime = Date.now() - startTime;

      console.error('[WebhookController] handleWebhook error:', {
        phone: req.body?.phone,
        businessId: req.body?.businessId,
        processingTime,
        error: error.message,
        stack: error.stack,
      });

      return res.status(500).json({
        message: 'Internal server error',
        error: error.message,
        where: 'webhookController.handleWebhook',
      });
    }
  }

  /**
   * Get session info (for debugging/admin)
   * 
   * Query params:
   * - phone: User phone number
   * - businessId: Business MongoDB ObjectId
   * 
   * @example
   *   GET /webhook/session-info?phone=9876543210&businessId=507f1f77bcf86cd799439011
   */
  async getSessionInfo(req, res) {
    try {
      const { phone, businessId } = req.query;

      if (!phone || !businessId) {
        return res.status(400).json({
          message: 'phone and businessId query parameters are required',
        });
      }

      const session = await SessionService.getOrCreateSession(phone, businessId);
      const metadata = SessionService.getSessionMetadata(session);

      return res.json({
        success: true,
        session: metadata,
      });
    } catch (error) {
      console.error('[WebhookController] getSessionInfo error:', error.message);

      return res.status(500).json({
        message: 'Failed to get session info',
        error: error.message,
      });
    }
  }

  /**
   * Reset session (for debugging/admin)
   * 
   * Request body:
   * {
   *   phone: string (required),
   *   businessId: string (required)
   * }
   * 
   * @example
   *   POST /webhook/reset-session
   *   {
   *     "phone": "9876543210",
   *     "businessId": "507f1f77bcf86cd799439011"
   *   }
   */
  async resetSession(req, res) {
    try {
      const { phone, businessId } = req.body;

      if (!phone || !businessId) {
        return res.status(400).json({
          message: 'phone and businessId are required',
        });
      }

      const session = await SessionService.getOrCreateSession(phone, businessId);
      await SessionService.resetSession(session);

      const metadata = SessionService.getSessionMetadata(session);

      return res.json({
        success: true,
        message: 'Session reset successfully',
        session: metadata,
      });
    } catch (error) {
      console.error('[WebhookController] resetSession error:', error.message);

      return res.status(500).json({
        message: 'Failed to reset session',
        error: error.message,
      });
    }
  }

  /**
   * Verify Razorpay payment from callback/frontend
   * Public endpoint for chat checkout completion
   */
  async verifyRazorpayPayment(req, res) {
    try {
      const {
        businessId,
        orderId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      } = req.body || {};

      if (!businessId || !razorpayPaymentId || !razorpaySignature || (!orderId && !razorpayOrderId)) {
        return res.status(400).json({
          message: 'businessId, razorpayPaymentId, razorpaySignature and orderId/razorpayOrderId are required',
        });
      }

      const order = await OrderService.verifyPayment({
        businessId,
        orderId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      });

      return res.json({
        success: true,
        message: 'Payment verified',
        order,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Razorpay webhook listener
   * Expects raw body for signature verification
   */
  async handleRazorpayWebhook(req, res) {
    try {
      const signature = req.headers['x-razorpay-signature'];
      const rawBody = req.body?.toString ? req.body.toString() : '';

      if (!signature || !rawBody) {
        return res.status(400).json({ message: 'Invalid webhook payload/signature' });
      }

      const isValid = PaymentService.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        return res.status(400).json({ message: 'Invalid webhook signature' });
      }

      const payload = JSON.parse(rawBody);
      const event = payload?.event;
      const paymentEntity = payload?.payload?.payment?.entity;

      if (!paymentEntity) {
        return res.status(200).json({ success: true, ignored: true });
      }

      const businessId = paymentEntity?.notes?.businessId;
      const razorpayOrderId = paymentEntity?.order_id;

      if (!businessId || !razorpayOrderId) {
        return res.status(200).json({ success: true, ignored: true });
      }

      if (event === 'payment.captured') {
        await OrderService.updatePaymentStatusByRazorpayOrder({
          businessId,
          razorpayOrderId,
          paymentStatus: 'Paid',
          orderStatus: 'Confirmed',
          razorpayPaymentId: paymentEntity.id,
        });
      } else if (event === 'payment.failed') {
        await OrderService.updatePaymentStatusByRazorpayOrder({
          businessId,
          razorpayOrderId,
          paymentStatus: 'Failed',
        });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default new WebhookController();
