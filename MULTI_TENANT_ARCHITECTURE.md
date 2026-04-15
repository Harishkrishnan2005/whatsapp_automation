# Multi-Tenant Architecture Implementation Guide

## Overview

This document describes the fully isolated multi-tenant architecture for the WhatsApp API automation system. Each business operates independently with strict data isolation.

---

## Core Principle

**UNIQUE ENTITY IDENTIFIER: `(phone + businessId)`**

This combination defines a unique customer session. The same phone number can exist in multiple businesses, each as a separate customer.

---

## Architecture Components

### 1. Database Layer

#### Models Updated for Multi-Tenancy

All models include `businessId` field with proper indexes:

```javascript
// Example: Customer Model
const customerSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  name: { type: String, trim: true },
  businessId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true 
  },
  // ... other fields
});

// Compound index for multi-tenant isolation
customerSchema.index({ phone: 1, businessId: 1 }, { unique: true });
customerSchema.index({ businessId: 1, createdAt: -1 });
```

#### Models with Multi-Tenant Support

| Model | businessId | Compound Index | Notes |
|-------|-----------|-----------------|-------|
| Customer | ✓ | (phone, businessId) unique | Core for tenant isolation |
| Message | ✓ | (businessId, customerId) | Chat history isolation |
| Session | ✓ | (phone, businessId) unique | Chatbot session state |
| Order | ✓ | (businessId, customerId) | Order isolation per business |
| Appointment | ✓ | (businessId, customerId) | Scheduling isolation |
| Campaign | ✓ | (businessId, createdAt) | Campaign isolation |
| Product | ✓ | (businessId, isActive) | Product catalog per business |
| ChatTemplate | ✓ | (businessId, category) | Template isolation |
| QuickReply | ✓ | (businessId, createdAt) | Response templates |
| Note | ✓ | (businessId, customerId) | Internal notes isolation |
| Notification | ✓ | (businessId, userId) | Alert isolation |
| ChatAssignment | ✓ | (businessId, status) | Assignment isolation |

---

### 2. Middleware Layer

#### Multi-Tenant Middleware (`middlewares/multiTenant.js`)

**`requireBusinessId`** - Validates businessId is present
```javascript
router.get('/customers', authenticateToken, requireBusinessId, getCustomers);
```

**`validateBusinessIdMatch`** - Prevents cross-business URL access
```javascript
router.get('/customers/:customerId', 
  authenticateToken, 
  validateBusinessIdMatch, 
  getCustomer
);
```

**`injectBusinessId`** - Adds businessId to webhook requests
```javascript
router.post('/webhook', injectBusinessId, handleWebhook);
```

#### Helper Functions (`middlewares/multiTenant.js`)

- `getTenantFilter(businessId)` - Returns `{ businessId }` filter
- `validateOwnership(doc, businessId)` - Ensures document belongs to business
- `mergeBusinessFilter(userFilter, businessId)` - Combines filters safely

---

### 3. Service Layer

#### Multi-Tenant Service Utilities (`services/multiTenantService.js`)

Provides standardized query builders:

```javascript
// Example: Paginated query with tenant isolation
const result = await paginatedQuery(
  Customer,
  { status: 'active' },  // user filter
  businessId,            // required
  1,                     // page
  10                     // limit
);
// Returns: { data, total, page, limit, totalPages }
```

**Available Functions:**

| Function | Purpose |
|----------|---------|
| `buildTenantFilter()` | Create tenant-scoped filter |
| `validateDocumentBelongsToTenant()` | Security: Verify ownership |
| `findOrCreateCustomer()` | Supports (phone + businessId) uniqueness |
| `paginatedQuery()` | Safe paginated queries |
| `bulkUpdateWithTenantCheck()` | Bulk operations with isolation |
| `aggregateWithTenant()` | Analytics with tenant isolation |
| `createWithTenant()` | Auto-inject businessId on creation |
| `deleteWithTenant()` | Delete with ownership verification |

---

### 4. Webhook Tenant Resolution

#### Phone Number ID Mapping (`services/webhookTenantResolver.js`)

Maps WhatsApp `phoneNumberId` to MongoDB `businessId`:

```javascript
// Production Setup Example:
const phoneMapping = {
  '123456789': 'business-id-1',  // WhatsApp phone 1 → Business 1
  '987654321': 'business-id-2',  // WhatsApp phone 2 → Business 2
};

// Resolve business from phone number
const businessId = resolveBusinessFromPhoneNumber('123456789');
```

**Resolution Priority:**
1. Provided `businessId` in request
2. Resolve from `phoneNumberId` mapping
3. Default business (testing only) 
4. Throw error if none found

**Usage in Webhook:**

```javascript
// Controller
async handleWebhook(req, res) {
  const { phone, message, phoneNumberId } = req.body;

  const businessId = await resolveTenantBusinessId({
    businessId: req.body.businessId,    // Direct ID
    phoneNumberId: phoneNumberId,       // Map from WhatsApp ID
    allowDefault: process.env.NODE_ENV === 'development'
  });

  // Process message with resolved businessId
  // ...
}
```

---

## Security Rules

### ✅ MUST DO

1. **Always include businessId in queries**
   ```javascript
   // ✓ Correct
   const customer = await Customer.findOne({ 
     phone, 
     businessId 
   });

   // ✗ Wrong
   const customer = await Customer.findOne({ phone });
   ```

2. **Validate businessId in JWT token**
   ```javascript
   // JWT payload should include:
   {
     userId: "...",
     email: "...",
     businessId: "507f1f77bcf86cd799439011",  // ← Critical
     role: "staff"
   }
   ```

3. **Use compound indexes for common queries**
   ```javascript
   // Good index design
   (phone, businessId) unique
   (customerId, businessId)
   (businessId, createdAt) descending
   ```

4. **Validate ownership before returns**
   ```javascript
   const customer = await Customer.findById(id);
   if (String(customer.businessId) !== String(req.user.businessId)) {
     throw new Error('Access denied');
   }
   ```

### ❌ DO NOT

1. **DO NOT** fetch data without businessId filter
   ```javascript
   // ✗ Never do this
   const customers = await Customer.find();  // Gets all customers!
   ```

2. **DO NOT** allow cross-business queries
   ```javascript
   // ✗ Wrong: Admin accessing another business data
   const data = await Customer.find({ /* no businessId */ });
   ```

3. **DO NOT** skip ownership validation
   ```javascript
   // ✗ Wrong: Returning without verification
   const order = await Order.findById(orderId);
   return order;  // No businessId check!
   ```

4. **DO NOT** use fallback logic for missing data
   ```javascript
   // ✗ Wrong: Falling back to default
   if (!result) {
     return defaultBusiness.data;  // Data leak!
   }
   ```

---

## Implementation Patterns

### Pattern 1: Simple Query

```javascript
// BAD: No multi-tenancy
const customers = await Customer.find({ status: 'active' });

// GOOD: Multi-tenant safe
const customers = await Customer.find({
  status: 'active',
  businessId: req.user.businessId
});

// BEST: Using helper
const filter = buildTenantFilter({ status: 'active' }, req.user.businessId);
const customers = await Customer.find(filter);
```

### Pattern 2: Creation with Auto-Injection

```javascript
// Create customer for a specific business
const customer = await createWithTenant(
  Customer,
  { 
    phone: '9876543210',
    name: 'John Doe'
  },
  req.user.businessId
);
// Returns customer with businessId automatically set
```

### Pattern 3: Ownership Validation

```javascript
async getCustomer(req, res) {
  try {
    const customer = await Customer.findById(req.params.id);
    
    // Verify ownership
    validateDocumentBelongsToTenant(
      customer, 
      req.user.businessId,
      `Customer ${req.params.id}`
    );

    res.json(customer);
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
}
```

### Pattern 4: Paginated Query

```javascript
async getCustomers(req, res) {
  const { page = 1, limit = 10 } = req.query;

  const result = await paginatedQuery(
    Customer,
    { status: 'active' },
    req.user.businessId,
    page,
    limit
  );

  res.json(result);
}
```

### Pattern 5: Aggregation Pipeline

```javascript
async getOrderStats(req, res) {
  const stats = await aggregateWithTenant(
    Order,
    [
      {
        $match: { orderStatus: 'completed' }
      },
      {
        $group: {
          _id: '$product',
          totalSales: { $sum: '$finalPrice' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { totalSales: -1 }
      }
    ],
    req.user.businessId
  );

  res.json(stats);
}
```

---

## Multi-Tenant Scenarios

### Scenario 1: Same Customer, Different Businesses

```javascript
// Business A
const customerA = await Customer.findOne({
  phone: '9876543210',
  businessId: businessIdA
});
// Result: Exists as Customer A's data

// Business B  
const customerB = await Customer.findOne({
  phone: '9876543210',
  businessId: businessIdB
});
// Result: Exists as Customer B's data
// ✓ Same phone, different records - fully isolated
```

### Scenario 2: Session Isolation

```javascript
// Business A session
const sessionA = await Session.findOne({
  phone: '9876543210',
  businessId: businessIdA
});
// step: 'ask_name'

// Business B session (same phone, different context)
const sessionB = await Session.findOne({
  phone: '9876543210',
  businessId: businessIdB
});
// step: 'main_menu'
// ✓ Completely independent conversation states
```

### Scenario 3: Cross-Business Query Prevention

```javascript
// Admin tries to access another business's data
const staffUser = {
  businessId: businessIdA,
  role: 'employee'
};

// This will fail - staff can only access their business
const result = await getOrders(businessIdB);
// ✗ Error: Access denied (if properly implemented)
```

---

## Chatbot Engine Integration

### Multi-Tenant Chatbot Flow

```javascript
// Input: phone, message, businessId
const result = await ChatbotEngine.chatbotEngine({
  phone: '9876543210',
  message: 'show products',
  businessId: '507f1f77bcf86cd799439011'
});

// Engine guarantees:
// 1. Session fetched with (phone + businessId)
// 2. Customer fetched with (phone + businessId)  
// 3. ChatbotFlow filtered by businessId
// 4. No cross-business data leakage
```

**Flow Configuration:**
```javascript
const flow = await ChatbotFlow.findOne({
  businessId,           // ← Multi-tenant filter
  trigger: normalizedMessage,
  step: session.step,
  isActive: true
}).lean();
```

---

## Frontend Implementation

### Store Business ID in Auth State

```javascript
// Initial login response
{
  token: "jwt_token_with_businessId",
  user: {
    id: "user-id",
    email: "user@business.com",
    businessId: "507f1f77bcf86cd799439011"
  }
}

// Store in context/localStorage
const AuthContext = createContext();
export function useAuth() {
  const { businessId } = useContext(AuthContext);
  return businessId;  // Use in all API calls
}
```

### Send BusinessID in Every Request

```javascript
// API Service
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL
});

api.interceptors.request.use(config => {
  const businessId = localStorage.getItem('businessId');
  config.headers['X-Business-ID'] = businessId;
  // OR in body for formData endpoints
  config.data = { ...config.data, businessId };
  return config;
});
```

### Frontend Route Protection

```javascript
// ProtectedRoute with business check
function ProtectedRoute({ children }) {
  const { isAuthenticated, businessId } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!businessId) return <div>Loading business context...</div>;
  
  return children;
}
```

---

## Migration Path from Single to Multi-Tenant

### Phase 1: Add BusinessID Field
- Add `businessId` to all models
- Create indexes
- Don't enforce yet

### Phase 2: Gradual Migration
- Set `businessId = defaultBusiness._id` for legacy records
- Update queries incrementally
- Test with specific business context

### Phase 3: Enforcement
- Require `businessId` in all queries
- Remove legacy document support
- Full isolation mode

### Phase 4: Optimization
- Archive old data by business
- Implement data residency rules
- Add business-specific backups

---

## Error Handling

### Expected Multi-Tenant Errors

```javascript
// 400: Missing businessId
{
  message: 'Business ID is required',
  code: 'MISSING_BUSINESS_ID'
}

// 403: Access denied
{
  message: 'Document does not belong to your business',
  code: 'BUSINESS_ACCESS_DENIED'
}

// 404: Not found (could be in another business)
{
  message: 'Resource not found',
  code: 'NOT_FOUND'
}
```

### Proper Error Handling

```javascript
try {
  const customer = await Customer.findById(id);
  validateDocumentBelongsToTenant(customer, businessId);
  return customer;
} catch (error) {
  if (error.message.includes('does not belong')) {
    return res.status(403).json({ message: error.message });
  }
  return res.status(500).json({ message: 'Internal error' });
}
```

---

## Monitoring & Verification

### Query Verification Checklist

- [ ] Query includes `businessId` filter
- [ ] Index exists for query pattern
- [ ] Returned data validated for ownership
- [ ] API validates `businessId` in JWT
- [ ] Middleware enforces `businessId` requirement

### Automated Checks

```javascript
// Audit: Ensure no queries without businessId
const auditQueries = () => {
  return Model.collection.getIndexes()
    .filter(idx => !idx.businessId)
    .warn('Found query pattern without businessId!');
};
```

---

## Performance Considerations

### Index Strategy

```javascript
// Create these indexes for optimal performance

// Lookups
db.customers.createIndex({ phone: 1, businessId: 1 }, { unique: true });
db.customers.createIndex({ _id: 1, businessId: 1 });

// Queries
db.messages.createIndex({ businessId: 1, customerId: 1, createdAt: -1 });
db.orders.createIndex({ businessId: 1, orderStatus: 1, createdAt: -1 });
db.sessions.createIndex({ phone: 1, businessId: 1 }, { unique: true });

// Analytics
db.orders.createIndex({ businessId: 1, createdAt: -1 });
```

### Query Performance Tips

1. Always filter by `businessId` first
2. Combine with other filters in $match stage
3. Use covered queries when possible
4. Avoid large $lookup operations

---

## Troubleshooting

### Issue: Same phone in multiple businesses

**Solution:** This is expected!
```javascript
// Each business has their own customer record
Business A: Phone 9876543210 → Customer A
Business B: Phone 9876543210 → Customer B
```

### Issue: Cross-business data visible

**Solution:** Check middleware enforcement
```javascript
// Verify middleware is applied
router.get('/customers', 
  authenticateToken,
  requireBusinessId,  // ← Must be present
  getCustomers
);
```

### Issue: Performance degradation

**Solution:** Check indexes
```javascript
// Ensure indexes exist
db.customers.getIndexes();  // Should show businessId indexes
```

---

## Conclusion

This multi-tenant architecture ensures:
- ✓ Complete data isolation per business
- ✓ Same customer data in multiple businesses
- ✓ No cross-business data leakage
- ✓ Scalable and maintainable design
- ✓ Security-first implementation
