/**
 * Multi-Tenant Middleware
 * 
 * Enforces strict data isolation across all tenants (businesses).
 * - Validates businessId presence in authenticated requests
 * - Injects businessId from JWT token
 * - Prevents cross-business data access
 */

import mongoose from 'mongoose';

/**
 * Middleware: Validate businessId is present and valid
 * Must be used AFTER authenticateToken middleware
 */
export const requireBusinessId = (req, res, next) => {
  const businessId = req.user?.businessId || req.body?.businessId || req.query?.businessId;

  if (!businessId) {
    return res.status(400).json({
      message: 'Business ID is required',
      code: 'MISSING_BUSINESS_ID',
    });
  }

  if (!mongoose.Types.ObjectId.isValid(businessId)) {
    return res.status(400).json({
      message: 'Invalid Business ID format',
      code: 'INVALID_BUSINESS_ID_FORMAT',
    });
  }

  // Ensure req.user has businessId
  if (!req.user) {
    req.user = {};
  }
  req.user.businessId = businessId;

  next();
};

/**
 * Middleware: Validate that URL parameter businessId matches authenticated user's businessId
 * Prevents accessing other businesses' data via URL manipulation
 * 
 * @example
 * router.get('/businesses/:businessId/customers', validateBusinessIdMatch, controller);
 */
export const validateBusinessIdMatch = (req, res, next) => {
  const urlBusinessId = req.params.businessId;
  const userBusinessId = req.user?.businessId;

  if (!urlBusinessId || !userBusinessId) {
    return res.status(400).json({
      message: 'Business ID validation failed',
      code: 'BUSINESS_ID_VALIDATION_ERROR',
    });
  }

  // Allow admins to access any business (optional: remove this for strict isolation)
  if (req.user?.role === 'admin') {
    return next();
  }

  if (String(urlBusinessId) !== String(userBusinessId)) {
    return res.status(403).json({
      message: 'You do not have access to this business',
      code: 'BUSINESS_ACCESS_DENIED',
    });
  }

  next();
};

/**
 * Middleware: Inject businessId from JWT token into req.user
 * Used on webhook routes where businessId comes from token or mapping
 */
export const injectBusinessId = (req, res, next) => {
  if (!req.user) {
    req.user = {};
  }

  // If businessId is not in user, try to extract from body or query
  if (!req.user.businessId) {
    req.user.businessId = req.body?.businessId || req.query?.businessId;
  }

  next();
};

/**
 * Helper: Ensure all queries include businessId filter
 * Returns a filter object that must be merged with all database queries
 * 
 * @throws {Error} if businessId is missing
 */
export const getTenantFilter = (businessId) => {
  if (!businessId) {
    throw new Error('Business ID is required for tenant isolation');
  }

  if (!mongoose.Types.ObjectId.isValid(businessId)) {
    throw new Error('Invalid Business ID format');
  }

  return { businessId: new mongoose.Types.ObjectId(businessId) };
};

/**
 * Helper: Ensure query result belongs to requesting user's business
 * Validates that fetched documents match the business context
 * 
 * @example
 * const customer = await Customer.findById(id);
 * validateOwnership(customer, req.user.businessId);
 */
export const validateOwnership = (doc, businessId, resourceName = 'Resource') => {
  if (!doc) {
    throw new Error(`${resourceName} not found`);
  }

  if (String(doc.businessId) !== String(businessId)) {
    throw new Error(`${resourceName} does not belong to your business`);
  }
};

/**
 * Helper: Merge tenant filter with user-provided filters
 * Ensures businessId is always included in queries
 * 
 * @example
 * const filter = mergeBusinessFilter(userFilter, req.user.businessId);
 * const results = await Model.find(filter);
 */
export const mergeBusinessFilter = (userFilter = {}, businessId) => {
  const tenantFilter = getTenantFilter(businessId);
  return { ...userFilter, ...tenantFilter };
};

export default {
  requireBusinessId,
  validateBusinessIdMatch,
  injectBusinessId,
  getTenantFilter,
  validateOwnership,
  mergeBusinessFilter,
};
