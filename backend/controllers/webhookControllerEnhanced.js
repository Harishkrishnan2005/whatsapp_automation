/**
 * Enhanced Webhook Controller for Multi-Tenant Support
 * 
 * This updated version shows how to integrate webhookTenantResolver
 * for proper PhoneNumberId → BusinessId mapping
 * 
 * Usage Example:
 * POST /webhook
 * {
 *   "phone": "9876543210",
 *   "message": "show products",
 *   "phoneNumberId": "123456789"  // WhatsApp phone number ID
 * }
 */

import ChatbotEngine from '../services/chatbotEngine.js';
import SessionService from '../services/sessionService.js';
import Customer from '../models/Customer.js';
import {
  resolveTenantBusinessId,
  registerPhoneNumberMapping,
  getAllPhoneNumberMappings,
} from '../services/webhookTenantResolver.js';
import {
  buildTenantFilter,
} from '../services/multiTenantService.js';

/**
 * Production-Grade Multi-Tenant Webhook Controller
 * 
 * Features:
 * - PhoneNumberId to BusinessId mapping
 * - Strict tenant isolation
 * - Message audit trail
 * - Error handling with proper codes
 * - Session state management
 */
class WebhookController {
  /**
   * Main webhook handler
   * 
   * @route POST /webhook
   * @bodyParam {string} phone - Customer phone number (required)
   * @bodyParam {string} message - Customer message (required)
   * @bodyParam {string} phoneNumberId - WhatsApp phone number ID (optional)
   * @bodyParam {string} businessId - Explicit business ID (optional)
   * 
   * Priority for tenant resolution:
   * 1. Explicit businessId in request
   * 2. phoneNumberId mapping
   * 3. Throw error (no default in production)
   */
  async handleWebhook(req, res) {
    const startTime = Date.now();

    try {
      // ==================
      // STEP 1: Validate Input
      // ==================
      const {
        phone,
        message,
        phoneNumberId,
        businessId: explicitBusinessId,
        includeSessionInfo = false,
      } = req.body;

      const normalizedPhone = String(phone || '').trim();
      const incomingText = String(message || '').trim();

      if (!normalizedPhone || !incomingText) {
        return res.status(400).json({
          success: false,
          message: 'phone and message are required',
          code: 'INVALID_INPUT',
          example: {
            phone: '919876543210',
            message: 'show products',
            phoneNumberId: 'optional-whatsapp-phone-id',
          },
        });
      }

      // ==================
      // STEP 2: Resolve Business Tenant
      // ==================
      let resolvedBusinessId;
      try {
        resolvedBusinessId = await resolveTenantBusinessId({
          businessId: explicitBusinessId,
          phoneNumberId,
          allowDefault: process.env.NODE_ENV === 'development', // Only in dev
        });
      } catch (error) {
        console.error('[Webhook] Business resolution failed:', {
          phoneNumberId,
          explicitBusinessId,
          error: error.message,
        });

        return res.status(400).json({
          success: false,
          message: error.message,
          code: 'BUSINESS_RESOLUTION_ERROR',
        });
      }

      if (!resolvedBusinessId) {
        return res.status(400).json({
          success: false,
          message: 'Unable to resolve business context',
          code: 'NO_BUSINESS_CONTEXT',
        });
      }

      // ==================
      // STEP 3: Find or Create Customer (Tenant-Scoped)
      // ==================
      let customer;
      try {
        customer = await Customer.findOne(
          buildTenantFilter({ phone: normalizedPhone }, resolvedBusinessId)
        );

        if (!customer) {
          customer = await Customer.create({
            phone: normalizedPhone,
            businessId: resolvedBusinessId,
            name: '', // Will be filled by chatbot flow
            status: 'new',
            chatState: 'ASK_NAME',
          });

          console.log(`[Webhook] New customer created: ${normalizedPhone} in business ${resolvedBusinessId}`);
        }
      } catch (error) {
        console.error('[Webhook] Customer lookup/creation failed:', {
          phone: normalizedPhone,
          businessId: resolvedBusinessId,
          error: error.message,
        });

        return res.status(500).json({
          success: false,
          message: 'Failed to process customer',
          code: 'CUSTOMER_ERROR',
        });
      }

      // ==================
      // STEP 4: Process Through Chatbot Engine
      // ==================
      let botResult;
      try {
        console.log('[WebhookEnhanced] Incoming webhook message:', {
          phone: normalizedPhone,
          message: incomingText,
          businessId: String(resolvedBusinessId),
        });

        botResult = await ChatbotEngine.chatbotEngine({
          phone: normalizedPhone,
          message: incomingText,
          businessId: resolvedBusinessId,
        });

        console.log('[WebhookEnhanced] Engine response:', {
          businessId: String(resolvedBusinessId),
          type: botResult?.type || 'text',
          response: botResult?.response || botResult?.text || '',
        });
      } catch (error) {
        console.error('[Webhook] Chatbot engine error:', {
          phone: normalizedPhone,
          businessId: resolvedBusinessId,
          error: error.message,
        });

        botResult = {
          response: 'Unable to process your request. Please try again.',
          text: 'Unable to process your request. Please try again.',
          products: [],
          type: 'text',
        };
      }

      // ==================
      // STEP 5: Build Response
      // ==================
      const responsePayload = {
        success: true,
        response: botResult.response || botResult.text,
        text: botResult.text,
        products: botResult.products || [],
        type: botResult.type || 'text',
        payment: botResult.payment || null,
      };

      // Optional: Include session info for debugging
      if (includeSessionInfo && process.env.NODE_ENV === 'development') {
        try {
          const session = await SessionService.getOrCreateSession(
            normalizedPhone,
            resolvedBusinessId
          );
          responsePayload.sessionInfo = {
            step: session.step,
            context: session.context,
            updatedAt: session.updatedAt,
          };
        } catch (err) {
          console.error('[Webhook] Failed to get session info:', err.message);
          // Don't fail response
        }
      }

      const processingTime = Date.now() - startTime;
      console.log(`[Webhook] Success:`, {
        phone: normalizedPhone,
        businessId: String(resolvedBusinessId).slice(0, 8),
        processingTime: `${processingTime}ms`,
      });

      return res.json(responsePayload);
    } catch (error) {
      const processingTime = Date.now() - startTime;

      console.error('[Webhook] Unhandled error:', {
        phone: req.body?.phone,
        phoneNumberId: req.body?.phoneNumberId,
        businessId: req.body?.businessId,
        processingTime: `${processingTime}ms`,
        error: error.message,
        stack: error.stack,
      });

      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Get session info (for debugging/admin)
   * 
   * @route GET /webhook/session-info
   * @query {string} phone - Customer phone
   * @query {string} phoneNumberId - WhatsApp phone ID
   * @query {string} businessId - Business ID (fallback)
   */
  async getSessionInfo(req, res) {
    try {
      const { phone, phoneNumberId, businessId } = req.query;

      if (!phone) {
        return res.status(400).json({
          message: 'phone query parameter is required',
        });
      }

      // Resolve business from ID or mapping
      let resolvedBusinessId;
      try {
        resolvedBusinessId = await resolveTenantBusinessId({
          businessId,
          phoneNumberId,
        });
      } catch (error) {
        return res.status(400).json({
          message: error.message,
          code: 'BUSINESS_RESOLUTION_ERROR',
        });
      }

      const session = await SessionService.getOrCreateSession(
        phone,
        resolvedBusinessId
      );

      return res.json({
        success: true,
        session: {
          phone: session.phone,
          step: session.step,
          context: session.context,
          lastMessage: session.lastMessage,
          updatedAt: session.updatedAt,
        },
      });
    } catch (error) {
      console.error('[Webhook] getSessionInfo error:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Failed to get session info',
        error: error.message,
      });
    }
  }

  /**
   * Reset session (for debugging/admin)
   * 
   * @route POST /webhook/reset-session
   * @bodyParam {string} phone - Customer phone (required)
   * @bodyParam {string} phoneNumberId - WhatsApp phone ID (optional)
   * @bodyParam {string} businessId - Business ID (fallback)
   */
  async resetSession(req, res) {
    try {
      const { phone, phoneNumberId, businessId } = req.body;

      if (!phone) {
        return res.status(400).json({
          message: 'phone is required',
        });
      }

      // Resolve business
      let resolvedBusinessId;
      try {
        resolvedBusinessId = await resolveTenantBusinessId({
          businessId,
          phoneNumberId,
        });
      } catch (error) {
        return res.status(400).json({
          message: error.message,
          code: 'BUSINESS_RESOLUTION_ERROR',
        });
      }

      const session = await SessionService.getOrCreateSession(
        phone,
        resolvedBusinessId
      );
      await SessionService.resetSession(session);

      return res.json({
        success: true,
        message: 'Session reset successfully',
        session: {
          phone: session.phone,
          step: session.step,
        },
      });
    } catch (error) {
      console.error('[Webhook] resetSession error:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Failed to reset session',
        error: error.message,
      });
    }
  }

  /**
   * Register a new WhatsApp phone number mapping (Admin API)
   * 
   * @route POST /webhook/register-phone
   * @bodyParam {string} phoneNumberId - WhatsApp phone number ID (required)
   * @bodyParam {string} businessId - MongoDB business ID (required)
   * @bodyParam {string} whatsappNumber - WhatsApp account number
   */
  async registerPhoneNumber(req, res) {
    try {
      const { phoneNumberId, businessId, whatsappNumber } = req.body;

      if (!phoneNumberId || !businessId) {
        return res.status(400).json({
          message: 'phoneNumberId and businessId are required',
        });
      }

      // Only admin can register
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          message: 'Only admins can register phone numbers',
        });
      }

      registerPhoneNumberMapping(phoneNumberId, businessId, whatsappNumber);

      return res.json({
        success: true,
        message: 'Phone number mapping registered',
        mapping: {
          phoneNumberId,
          businessId,
          whatsappNumber,
        },
      });
    } catch (error) {
      console.error('[Webhook] registerPhoneNumber error:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Failed to register phone number',
        error: error.message,
      });
    }
  }

  /**
   * Get all phone number mappings (Admin API)
   * 
   * @route GET /webhook/phone-mappings
   */
  async getPhoneMappings(req, res) {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          message: 'Only admins can view phone mappings',
        });
      }

      const mappings = getAllPhoneNumberMappings();

      return res.json({
        success: true,
        mappings,
        total: Object.keys(mappings).length,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to get phone mappings',
        error: error.message,
      });
    }
  }
}

export default new WebhookController();
