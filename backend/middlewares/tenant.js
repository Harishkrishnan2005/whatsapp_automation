import mongoose from 'mongoose';

/**
 * Tenant Middleware
 * Extracts tenantId from authenticated user and sets it on the request object.
 */
export const tenantMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const tenantId = req.user.tenantId || req.user.businessId; // Fallback to businessId for compatibility

  if (!tenantId) {
    return res.status(403).json({ 
      message: 'Access denied: No tenant associated with this account',
      code: 'MISSING_TENANT_ID'
    });
  }

  if (!mongoose.Types.ObjectId.isValid(tenantId)) {
    return res.status(400).json({ 
      message: 'Invalid Tenant ID format',
      code: 'INVALID_TENANT_ID'
    });
  }

  req.tenantId = tenantId;
  next();
};

/**
 * Helper to ensure tenant isolation in queries
 */
export const withTenant = (query = {}, req) => {
  if (!req.tenantId) {
    throw new Error('Tenant ID is missing in request context');
  }
  return { ...query, tenantId: req.tenantId };
};

/**
 * Validator to check if a document belongs to the current tenant
 */
export const validateTenantOwnership = (doc, req) => {
  if (!doc) return;
  
  const docTenantId = doc.tenantId || doc.businessId;
  if (String(docTenantId) !== String(req.tenantId)) {
    const error = new Error('Cross-tenant data access blocked');
    error.status = 403;
    throw error;
  }
};
