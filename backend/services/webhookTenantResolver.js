/**
 * Webhook Tenant Resolver
 * 
 * Maps WhatsApp phoneNumberId to businessId for multi-tenant support
 * This allows the webhook to route messages to the correct business
 * 
 * In production, this mapping should be stored in MongoDB for dynamic configuration
 */

import Business from '../models/Business.js';

/**
 * Webhook Phone Number Mapping
 * 
 * Maps WhatsApp phoneNumberId to MongoDB businessId
 * 
 * PRODUCTION SETUP:
 * Store these mappings in a separate WhatsAppPhoneMapping collection:
 * 
 * {
 *   phoneNumberId: "123456789",
 *   businessId: ObjectId,
 *   whatsappAccountNumber: "919876543210",
 *   webhookToken: "secure_token",
 *   createdAt: Date,
 *   isActive: true
 * }
 */

const PHONE_NUMBER_MAPPING = {
  // Example: phoneNumberId -> businessId
  // '123456789': 'business-id-1',
  // '987654321': 'business-id-2',
};

/**
 * Initialize webhook phone number mapping from database
 * Call this on server startup to load all active mappings
 */
export async function initializePhoneMapping() {
  try {
    // In production, load from WhatsAppPhoneMapping collection
    // const mappings = await WhatsAppPhoneMapping.find({ isActive: true });
    // mappings.forEach(m => {
    //   PHONE_NUMBER_MAPPING[m.phoneNumberId] = m.businessId.toString();
    // });

    console.log('[WebhookTenantResolver] Phone mapping initialized:', Object.keys(PHONE_NUMBER_MAPPING).length);
  } catch (error) {
    console.error('[WebhookTenantResolver] Failed to initialize phone mapping:', error);
  }
}

/**
 * Resolve businessId from WhatsApp phoneNumberId
 * 
 * @param {string} phoneNumberId - WhatsApp phone number ID from webhook
 * @returns {string|null} Business ID if found
 * 
 * @example
 * const businessId = resolveBusinessFromPhoneNumber('123456789');
 */
export function resolveBusinessFromPhoneNumber(phoneNumberId) {
  if (!phoneNumberId) {
    return null;
  }

  return PHONE_NUMBER_MAPPING[String(phoneNumberId)] || null;
}

/**
 * Resolve businessId with fallback strategy
 * 
 * Priority:
 * 1. Use provided businessId if valid
 * 2. Resolve from phoneNumberId mapping
 * 3. Use default business (for testing)
 * 4. Throw error if none found
 * 
 * @param {Object} options
 * @param {string} options.businessId - Explicit business ID
 * @param {string} options.phoneNumberId - WhatsApp phone number ID
 * @param {boolean} options.allowDefault - Allow fallback to default business
 * @returns {Promise<string>} Resolved business ID
 */
export async function resolveTenantBusinessId(options = {}) {
  const { businessId, phoneNumberId, allowDefault = true } = options;

  // Priority 1: Explicit businessId
  if (businessId) {
    return businessId;
  }

  // Priority 2: Resolve from phone number mapping
  if (phoneNumberId) {
    const resolvedId = resolveBusinessFromPhoneNumber(phoneNumberId);
    if (resolvedId) {
      return resolvedId;
    }
  }

  // Priority 3: Fallback to default business (for testing/automation)
  if (allowDefault) {
    const defaultBusiness = await Business.findOne().select('_id').lean();
    if (defaultBusiness?._id) {
      console.log('[WebhookTenantResolver] Using default business:', defaultBusiness._id);
      return defaultBusiness._id;
    }
  }

  throw new Error(
    'Unable to resolve business context. Provide businessId or configure phoneNumberId mapping.'
  );
}

/**
 * Register a new WhatsApp phone number to a business
 * 
 * In production, this should:
 * 1. Validate business ownership
 * 2. Verify WhatsApp phone number
 * 3. Store in database with webhookToken
 * 4. Update PHONE_NUMBER_MAPPING cache
 * 
 * @param {string} phoneNumberId - WhatsApp phone number ID
 * @param {string} businessId - MongoDB business ID
 * @param {string} whatsappNumber - WhatsApp account number
 */
export function registerPhoneNumberMapping(phoneNumberId, businessId, whatsappNumber) {
  if (!phoneNumberId || !businessId) {
    throw new Error('phoneNumberId and businessId are required');
  }

  PHONE_NUMBER_MAPPING[String(phoneNumberId)] = String(businessId);

  console.log(`[WebhookTenantResolver] Registered phone mapping: ${phoneNumberId} -> ${businessId}`);

  // In production, persist to database:
  // await WhatsAppPhoneMapping.updateOne(
  //   { phoneNumberId },
  //   {
  //     phoneNumberId,
  //     businessId,
  //     whatsappAccountNumber: whatsappNumber,
  //     isActive: true,
  //   },
  //   { upsert: true }
  // );
}

/**
 * Unregister a WhatsApp phone number mapping
 */
export function unregisterPhoneNumberMapping(phoneNumberId) {
  if (PHONE_NUMBER_MAPPING[phoneNumberId]) {
    delete PHONE_NUMBER_MAPPING[phoneNumberId];
    console.log(`[WebhookTenantResolver] Unregistered phone mapping: ${phoneNumberId}`);
  }
}

/**
 * Get all active phone number mappings
 * For admin dashboard/debugging
 */
export function getAllPhoneNumberMappings() {
  return { ...PHONE_NUMBER_MAPPING };
}

export default {
  initializePhoneMapping,
  resolveBusinessFromPhoneNumber,
  resolveTenantBusinessId,
  registerPhoneNumberMapping,
  unregisterPhoneNumberMapping,
  getAllPhoneNumberMappings,
};
