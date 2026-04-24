/**
 * Multi-Tenant Scope Utility
 * Ensures all database queries are scoped to the correct tenant.
 */
const buildTenantScope = (businessId) => {
  if (!businessId) {
    return {};
  }
  
  // Return both for backward compatibility during migration
  return { 
    $or: [
      { tenantId: businessId },
      { businessId: businessId }
    ]
  };
};

// Strict version for new/updated queries
export const strictTenantScope = (tenantId) => {
  if (!tenantId) {
    throw new Error('Tenant ID is required for strict isolation');
  }
  return { tenantId };
};

export default buildTenantScope;
