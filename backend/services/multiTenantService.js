/**
 * Multi-Tenant Service Utilities
 * 
 * Provides reusable query helpers to ensure all queries include businessId validation.
 * This prevents accidental cross-business data leakage.
 */

import mongoose from 'mongoose';

/**
 * Build tenant-scoped query filter
 * Combines user filter with mandatory businessId filter
 * 
 * @example
 * const filter = buildTenantFilter({ status: 'active' }, businessId);
 * // Returns: { status: 'active', businessId: ObjectId }
 */
export function buildTenantFilter(userFilter = {}, businessId) {
  if (!businessId) {
    throw new Error('[MultiTenant] Business ID is required for query filter');
  }

  const businessIdObj = mongoose.Types.ObjectId.isValid(businessId)
    ? new mongoose.Types.ObjectId(businessId)
    : businessId;

  return {
    ...userFilter,
    businessId: businessIdObj,
  };
}

/**
 * Validate that fetched document belongs to the business
 * Throws error if mismatch detected (security breach attempt)
 * 
 * @example
 * const customer = await Customer.findById(id);
 * validateDocumentBelongsToTenant(customer, businessId);
 */
export function validateDocumentBelongsToTenant(document, businessId, resourceName = 'Document') {
  if (!document) {
    throw new Error(`[MultiTenant] ${resourceName} not found`);
  }

  if (!document.businessId) {
    throw new Error(`[MultiTenant] ${resourceName} has no business association`);
  }

  const docBusinessId = String(document.businessId);
  const expectedBusinessId = String(businessId);

  if (docBusinessId !== expectedBusinessId) {
    console.warn(`[MultiTenant] SECURITY: Attempted access to ${resourceName} from different business:`, {
      documentBusinessId: docBusinessId,
      requestBusinessId: expectedBusinessId,
      resourceId: document._id,
    });

    throw new Error(`[MultiTenant] ${resourceName} does not belong to your business`);
  }
}

/**
 * Validate customer belongs to business and return for further operations
 * 
 * @example
 * const customer = await Customer.findById(customerId);
 * ensureCustomerAccess(customer, customerId, businessId);
 */
export function ensureCustomerAccess(customer, customerId, businessId) {
  if (!customer) {
    throw new Error('Customer not found');
  }

  validateDocumentBelongsToTenant(customer, businessId, `Customer ${customerId}`);
  return customer;
}

/**
 * Check if customer exists with phone + businessId combination
 * 
 * @example
 * const exists = await validateCustomerInBusiness(phone, businessId);
 * if (!exists) throw new Error('Customer not found in this business');
 */
export async function validateCustomerInBusiness(Model, phone, businessId) {
  const customer = await Model.findOne(
    buildTenantFilter({ phone }, businessId)
  ).lean();

  return customer;
}

/**
 * Find or create customer with proper tenant isolation
 * Ensures same phone number can exist in multiple businesses
 * 
 * @example
 * const customer = await findOrCreateCustomer(
 *   Customer,
 *   { phone: '9876543210' },
 *   businessId
 * );
 */
export async function findOrCreateCustomer(Model, phoneData, businessId) {
  if (!businessId) {
    throw new Error('[MultiTenant] Business ID is required');
  }

  const filter = buildTenantFilter({ phone: phoneData.phone || phoneData }, businessId);

  let customer = await Model.findOne(filter);

  if (!customer) {
    customer = await Model.create({
      ...phoneData,
      phone: phoneData.phone || phoneData,
      businessId,
    });

    console.log(`[MultiTenant] New customer created: ${customer._id} in business ${businessId}`);
  }

  return customer;
}

/**
 * Paginated query with tenant filter
 * Returns { data, total, page, limit, totalPages }
 * 
 * @example
 * const result = await paginatedQuery(
 *   Customer,
 *   { status: 'active' },
 *   businessId,
 *   1,
 *   10
 * );
 */
export async function paginatedQuery(
  Model,
  userFilter = {},
  businessId,
  page = 1,
  limit = 10,
  sortField = 'createdAt',
  sortOrder = -1
) {
  const filter = buildTenantFilter(userFilter, businessId);

  const total = await Model.countDocuments(filter);
  const skip = (page - 1) * limit;

  const data = await Model.find(filter)
    .sort({ [sortField]: sortOrder })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Bulk operations with tenant isolation
 * Updates multiple documents with businessId validation
 * 
 * @example
 * await bulkUpdateWithTenantCheck(
 *   Order,
 *   { status: 'pending' },
 *   { status: 'processed' },
 *   businessId
 * );
 */
export async function bulkUpdateWithTenantCheck(
  Model,
  matchFilter,
  updateData,
  businessId
) {
  const filter = buildTenantFilter(matchFilter, businessId);

  const result = await Model.updateMany(
    filter,
    { $set: updateData },
    { new: true }
  );

  console.log(`[MultiTenant] Bulk update completed:`, {
    businessId,
    matched: result.matchedCount,
    modified: result.modifiedCount,
  });

  return result;
}

/**
 * Aggregate with tenant isolation
 * Ensures all pipeline stages include businessId filter
 * 
 * @example
 * const result = await aggregateWithTenant(
 *   Order,
 *   [
 *     { $match: { status: 'completed' } },
 *     { $group: { _id: '$product', total: { $sum: '$amount' } } }
 *   ],
 *   businessId
 * );
 */
export async function aggregateWithTenant(Model, pipeline = [], businessId) {
  if (!businessId) {
    throw new Error('[MultiTenant] Business ID is required for aggregation');
  }

  // Prepend business filter to ensure isolation
  const tenantPipeline = [
    {
      $match: {
        businessId: mongoose.Types.ObjectId.isValid(businessId)
          ? new mongoose.Types.ObjectId(businessId)
          : businessId,
      },
    },
    ...pipeline,
  ];

  return Model.aggregate(tenantPipeline);
}

/**
 * Create document with automatic businessId injection
 * 
 * @example
 * const order = await createWithTenant(Order, {
 *   customerId: '...',
 *   amount: 100
 * }, businessId);
 */
export async function createWithTenant(Model, data, businessId) {
  if (!businessId) {
    throw new Error('[MultiTenant] Business ID is required');
  }

  return Model.create({
    ...data,
    businessId,
  });
}

/**
 * Delete with tenant verification
 * Ensures you're only deleting from your business
 * 
 * @example
 * await deleteWithTenant(Order, orderId, businessId);
 */
export async function deleteWithTenant(Model, documentId, businessId) {
  const filter = {
    _id: documentId,
    businessId,
  };

  const result = await Model.findOneAndDelete(filter);

  if (!result) {
    throw new Error('Document not found or access denied');
  }

  return result;
}

export default {
  buildTenantFilter,
  validateDocumentBelongsToTenant,
  ensureCustomerAccess,
  validateCustomerInBusiness,
  findOrCreateCustomer,
  paginatedQuery,
  bulkUpdateWithTenantCheck,
  aggregateWithTenant,
  createWithTenant,
  deleteWithTenant,
};
