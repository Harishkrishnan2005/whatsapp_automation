# Multi-Tenant Security Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing multi-tenant security in your application. Follow these patterns to ensure strict data isolation and prevent security vulnerabilities.

---

## 1. Authentication & JWT Setup

### User Registration for Multi-Tenant

```javascript
// authController.js
async registerAdmin(req, res) {
  try {
    const { name, email, password, businessName, businessType } = req.body;

    // Service handles business creation + user creation
    const user = await AuthService.registerAdmin({
      name,
      email,
      password,
      businessName,
      businessType: businessType || 'E_COMMERCE'
    });

    res.status(201).json({
      message: 'Registration successful',
      user: user,
      // Note: JWT should already contain businessId
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}
```

### JWT Token Structure

```javascript
// Token must ALWAYS include businessId

// ✓ Correct JWT Payload
{
  id: "user-mongodb-id",
  email: "user@company.com",
  role: "staff",
  businessId: "507f1f77bcf86cd799439011",  // ← CRITICAL
  businessType: "E_COMMERCE"
}

// Decode in backend
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = decoded;  // Now has businessId
```

---

## 2. Route Protection Middleware

### Apply Middleware Stack

```javascript
// routes/customers.js
import { 
  authenticateToken, 
  requireBusinessId,
  validateBusinessIdMatch 
} from '../middlewares/multiTenant.js';

router.get(
  '/customers',
  authenticateToken,        // 1. Verify JWT token
  requireBusinessId,        // 2. Ensure businessId exists
  getCustomers              // 3. Controller
);

router.get(
  '/customers/:customerId',
  authenticateToken,
  validateBusinessIdMatch,  // Verify URL ID matches user's business
  getCustomerDetails
);
```

### Middleware Chain Order (CRITICAL)

```
1. authenticateToken       → Extracts JWT, sets req.user
2. requireBusinessId       → Validates req.user.businessId exists
3. Controller logic        → Uses req.user.businessId in queries
```

**Never skip step 1 or 2!**

---

## 3. Query Layer Security

### Template 1: Simple Find

```javascript
// controller.js

// ❌ WRONG - Can leak data from other businesses
const customer = await Customer.findById(customerId);

// ✅ CORRECT - Verifies business ownership
const customer = await Customer.findOne({
  _id: customerId,
  businessId: req.user.businessId
});

if (!customer) {
  return res.status(404).json({ message: 'Customer not found' });
}
```

### Template 2: List with Pagination

```javascript
// ✅ CORRECT PATTERN

async getCustomers(req, res) {
  try {
    const { page = 1, limit = 10, status } = req.query;

    // Build tenant-scoped filter
    const filter = buildTenantFilter(
      { status: status || undefined },
      req.user.businessId
    );

    // Execute query
    const result = await paginatedQuery(
      Customer,
      filter,
      req.user.businessId,
      page,
      limit
    );

    res.json(result);
  } catch (error) {
    console.error('[Security] Query error:', {
      businessId: req.user.businessId,
      error: error.message
    });
    res.status(500).json({ message: 'Internal error' });
  }
}
```

### Template 3: Create with Tenant Injection

```javascript
// ✅ CORRECT - Auto-injects businessId

async createOrder(req, res) {
  try {
    const { customerId, product, amount } = req.body;

    // Verify customer belongs to this business
    const customer = await Customer.findOne({
      _id: customerId,
      businessId: req.user.businessId
    });

    if (!customer) {
      return res.status(404).json({ 
        message: 'Customer not found in your business' 
      });
    }

    // Create with automatic businessId
    const order = await createWithTenant(
      Order,
      {
        customerId,
        product,
        amount,
        // Don't include businessId here - it's auto-injected
      },
      req.user.businessId
    );

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
```

### Template 4: Update with Verification

```javascript
// ✅ CORRECT - Verifies ownership before update

async updateOrder(req, res) {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // Fetch with businessId constraint
    const order = await Order.findOne({
      _id: orderId,
      businessId: req.user.businessId
    });

    if (!order) {
      return res.status(403).json({ 
        message: 'Order not found or access denied' 
      });
    }

    // Update only if ownership verified
    order.status = status;
    await order.save();

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
```

### Template 5: Delete with Double Verification

```javascript
// ✅ CORRECT - Verifies twice before delete

async deleteCustomer(req, res) {
  try {
    const { customerId } = req.params;

    // Step 1: Verify exists AND belongs to business
    const customer = await Customer.findOne({
      _id: customerId,
      businessId: req.user.businessId
    });

    if (!customer) {
      return res.status(403).json({ 
        message: 'No access to delete this customer' 
      });
    }

    // Step 2: Delete with businessId constraint
    await deleteWithTenant(
      Customer,
      customerId,
      req.user.businessId
    );

    res.json({ message: 'Customer deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
```

---

## 4. Webhook Security

### Webhook Phone Number Mapping

```javascript
// services/webhookTenantResolver.js configuration

// PRODUCTION: Store in database with validation
const PHONE_NUMBER_MAPPING = {
  '123456789': 'business-id-1',    // WhatsApp phone A
  '987654321': 'business-id-2',    // WhatsApp phone B
};

// Verify mapping on webhook receive
const businessId = resolveBusinessFromPhoneNumber(phoneNumberId);
if (!businessId) {
  return res.status(400).json({ 
    message: 'Unknown phone number ID',
    code: 'INVALID_WEBHOOK_SOURCE'
  });
}
```

### Webhook Handler Template

```javascript
// ✅ CORRECT - Multi-tenant webhook

async handleWebhook(req, res) {
  try {
    const { phone, message, phoneNumberId } = req.body;

    // Resolve business from phone number mapping
    const businessId = await resolveTenantBusinessId({
      phoneNumberId,
      allowDefault: false  // Don't use default - security risk
    });

    // Now all queries use this businessId
    let customer = await Customer.findOne({
      phone,
      businessId
    });

    if (!customer) {
      customer = await Customer.create({
        phone,
        businessId,  // ← From resolved mapping
        name: ''
      });
    }

    // Process message through engine
    const result = await ChatbotEngine.chatbotEngine({
      phone,
      message,
      businessId  // ← Passed everywhere
    });

    res.json({ response: result.response });
  } catch (error) {
    console.error('[Webhook Security]', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
}
```

---

## 5. Frontend Security

### Login Response Handling

```javascript
// frontend/authService.js

async login(email, password) {
  const response = await api.post('/auth/login', {
    email,
    password
  });

  const { accessToken, refreshToken, user } = response.data;

  // Store tokens
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);

  // ✓ Store businessId from user object
  localStorage.setItem('businessId', user.businessId);

  return { user, accessToken };
}
```

### API Interceptor

```javascript
// frontend/api.js

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL
});

// Automatically add businessId to all requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  const businessId = localStorage.getItem('businessId');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (businessId && config.method !== 'get') {
    // Add businessId to request body or params
    config.data = {
      ...config.data,
      businessId
    };
  }

  return config;
});
```

### Protected Routes

```javascript
// frontend/ProtectedRoute.jsx

function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const [isValid, setIsValid] = useState(null);

  useEffect(() => {
    const businessId = localStorage.getItem('businessId');
    const token = localStorage.getItem('accessToken');

    // ✓ Verify both token and businessId exist
    if (!token || !businessId) {
      navigate('/login');
      return;
    }

    setIsValid(true);
  }, [navigate]);

  if (isValid === null) return <div>Loading...</div>;
  if (!isValid) return null;

  return children;
}
```

---

## 6. Cross-Cutting Concerns

### Error Handling

```javascript
// Don't leak information
// ❌ Wrong
res.status(500).json({ 
  data: otherBusinessData,  // LEAK!
  error: 'Failed'
});

// ✅ Correct
res.status(500).json({ 
  message: 'Internal server error',
  code: 'INTERNAL_ERROR'
});
```

### Logging

```javascript
// Always log businessId for audit trail
console.log('[CustomerUpdate]', {
  businessId: req.user.businessId,
  customerId: req.params.id,
  changes: diff,
  timestamp: new Date().toISOString()
});
```

### Rate Limiting per Business

```javascript
// Rate limit by (ip + businessId) to prevent abuse
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  keyGenerator: (req) => {
    return `${req.ip}-${req.user?.businessId || 'anonymous'}`;
  },
  windowMs: 15 * 60 * 1000,
  max: 100
});

router.use(limiter);
```

---

## 7. Common Security Mistakes

### ❌ Mistake 1: Optional businessId

```javascript
// WRONG - businessId is optional
const filter = {
  status: 'active'
  // businessId missing!
};
const customers = await Customer.find(filter);
```

**Fix:**
```javascript
// CORRECT - businessId is mandatory
const filter = {
  status: 'active',
  businessId: req.user.businessId  // Always present
};
```

### ❌ Mistake 2: Accepting businessId from client

```javascript
// WRONG - Client sends businessId
const { customerId, businessId } = req.body;
const customer = await Customer.findById(customerId);
// Attacker can send different businessId

// CORRECT - Use only from JWT
const customer = await Customer.findOne({
  _id: customerId,
  businessId: req.user.businessId  // From token only
});
```

### ❌ Mistake 3: Admin bypass

```javascript
// WRONG - Admin can access everything
if (req.user.role === 'admin') {
  const customers = await Customer.find();  // Gets ALL customers!
}

// CORRECT - Even admin queries must include businessId
if (req.user.role === 'admin') {
  const customers = await Customer.find({
    businessId: req.user.businessId
  });
}
```

### ❌ Mistake 4: Forgetting middleware

```javascript
// WRONG - No requireBusinessId middleware
router.get('/customers', getCustomers);

// CORRECT - Middleware stack
router.get(
  '/customers',
  authenticateToken,
  requireBusinessId,
  getCustomers
);
```

---

## 8. Security Checklist

Before deploying to production:

- [ ] All models have `businessId` field
- [ ] All models have compound indexes with `businessId`
- [ ] All API routes have `requireBusinessId` middleware
- [ ] All queries include `businessId` filter
- [ ] JWT token includes `businessId`
- [ ] Frontend stores and sends `businessId`
- [ ] Webhook validates phone number mapping
- [ ] Error responses don't leak data
- [ ] Logging includes business context
- [ ] Admin access still includes `businessId` filter
- [ ] No default/fallback business logic in production
- [ ] Sensitive operations logged with audit trail
- [ ] Rate limiting includes business context

---

## 9. Testing for Security

### Test 1: Cross-Business Access Prevention

```javascript
// Should NOT find customer from other business
const customerA = await Customer.create({ phone: '123', businessId: A });
const found = await Customer.findOne({
  phone: '123',
  businessId: B
});
// Should be null
```

### Test 2: Ownership Validation

```javascript
// Should throw error
const customer = await Customer.create({
  phone: '123',
  businessId: A
});

expect(() => {
  validateDocumentBelongsToTenant(customer, B);
}).toThrow();
```

### Test 3: Webhook Isolation

```javascript
// Same phone in two businesses
const a = await handleWebhook({ phone: '123', businessId: A });
const b = await handleWebhook({ phone: '123', businessId: B });

// Should be different sessions
expect(a.session._id).not.toBe(b.session._id);
```

---

## Conclusion

This implementation ensures:
- ✓ Zero cross-business data leakage
- ✓ Same phone number in multiple businesses
- ✓ Complete tenant isolation
- ✓ Production-ready security
