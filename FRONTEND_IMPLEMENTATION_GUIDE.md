# Frontend Multi-Tenant Implementation Guide

## Overview

This guide provides frontend implementation patterns for multi-tenant support. The key is ensuring every API request includes the business context.

---

## 1. Authentication State Management

### Option A: React Context

```javascript
// context/AuthContext.jsx
import { createContext, useContext, useReducer, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [auth, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Restore from localStorage on mount
    const stored = localStorage.getItem('auth');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        dispatch({ type: 'RESTORE', payload: parsed });
      } catch (error) {
        console.error('Failed to restore auth state');
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Reducer
function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN': {
      const { user, accessToken, refreshToken } = action.payload;

      // ✓ Store businessId from user object
      localStorage.setItem('auth', JSON.stringify({
        user,
        accessToken,
        refreshToken,
        businessId: user.businessId
      }));

      return {
        user,
        accessToken,
        refreshToken,
        businessId: user.businessId,
        isAuthenticated: true
      };
    }

    case 'LOGOUT':
      localStorage.removeItem('auth');
      return initialState;

    case 'RESTORE':
      return {
        ...action.payload,
        isAuthenticated: !!action.payload.accessToken
      };

    default:
      return state;
  }
}

const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  businessId: null,
  isAuthenticated: false
};
```

### Option B: Redux

```javascript
// store/authSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  businessId: null,
  isAuthenticated: false
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthenticated: (state, action) => {
      const { user, accessToken, refreshToken } = action.payload;

      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.businessId = user.businessId;  // ← Critical
      state.isAuthenticated = true;

      // Persist to localStorage
      localStorage.setItem('businessId', user.businessId);
    },

    setLogout: (state) => {
      Object.assign(state, initialState);
      localStorage.removeItem('businessId');
    }
  }
});

export const { setAuthenticated, setLogout } = authSlice.actions;
export default authSlice.reducer;
```

---

## 2. API Service Configuration

### Axios Instance with Interceptors

```javascript
// services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 10000
});

/**
 * Request Interceptor
 * Automatically adds authorization and businessId
 */
api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    const businessId = localStorage.getItem('businessId');

    // Add authorization header
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Add businessId to body (for POST/PUT/PATCH)
    if (businessId && ['post', 'put', 'patch'].includes(config.method)) {
      config.data = {
        ...config.data,
        businessId
      };
    }

    // Add as header for visibility
    if (businessId) {
      config.headers['X-Business-ID'] = businessId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handles token refresh and auth errors
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${process.env.REACT_APP_API_URL}/auth/refresh`,
            { refreshToken }
          );

          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);

          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('businessId');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

## 3. Service Layer

### API Service Example

```javascript
// services/customerApi.js
import api from './api';

const CustomerAPI = {
  /**
   * Get all customers
   * businessId is auto-injected by interceptor
   */
  async getCustomers(page = 1, limit = 10) {
    try {
      const response = await api.get('/customers', {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      throw error;
    }
  },

  /**
   * Get single customer
   * You don't need to send businessId - it's verified server-side
   */
  async getCustomer(customerId) {
    try {
      const response = await api.get(`/customers/${customerId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 403) {
        throw new Error('You do not have access to this customer');
      }
      throw error;
    }
  },

  /**
   * Create customer
   * businessId is auto-added via interceptor
   */
  async createCustomer(data) {
    try {
      const response = await api.post('/customers', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create customer:', error);
      throw error;
    }
  },

  /**
   * Update customer
   */
  async updateCustomer(customerId, updates) {
    try {
      const response = await api.put(`/customers/${customerId}`, updates);
      return response.data;
    } catch (error) {
      if (error.response?.status === 403) {
        throw new Error('Cannot update customer from another business');
      }
      throw error;
    }
  }
};

export default CustomerAPI;
```

---

## 4. React Components

### Login Component

```javascript
// pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });

      const { user, accessToken, refreshToken } = response.data;

      // Store tokens and businessId
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('businessId', user.businessId);

      // Update auth context
      login({ user, accessToken, refreshToken });

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

### Protected Route Component

```javascript
// components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, businessId } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verify businessId is present
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    if (!businessId) {
      console.error('Business ID not found in auth state');
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  }, [isAuthenticated, businessId]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!businessId) {
    return <Navigate to="/error" replace />;
  }

  return children;
}
```

### Customer List Component

```javascript
// pages/Customers.jsx
import { useEffect, useState } from 'react';
import CustomerAPI from '../services/customerApi';
import { useAuth } from '../hooks/useAuth';

export function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const { businessId } = useAuth();

  useEffect(() => {
    if (!businessId) return;

    const loadCustomers = async () => {
      try {
        setLoading(true);
        // businessId is auto-injected by API service
        const data = await CustomerAPI.getCustomers(page, 10);
        setCustomers(data.customers);
        setError('');
      } catch (err) {
        console.error('Error loading customers:', err);
        setError(err.message || 'Failed to load customers');
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();
  }, [page, businessId]);

  if (!businessId) {
    return <div>Business context not loaded</div>;
  }

  if (loading) {
    return <div>Loading customers...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div>
      <h1>Customers</h1>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer._id}>
              <td>{customer.name}</td>
              <td>{customer.phone}</td>
              <td>{customer.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 5. Error Handling

### Custom Error Handler

```javascript
// utils/errorHandler.js
export function handleApiError(error) {
  if (!error.response) {
    return {
      message: 'Network error. Please check your connection.',
      code: 'NETWORK_ERROR'
    };
  }

  const { status, data } = error.response;

  switch (status) {
    case 400:
      return {
        message: data.message || 'Invalid request',
        code: 'VALIDATION_ERROR'
      };

    case 401:
      // Session expired
      localStorage.removeItem('accessToken');
      localStorage.removeItem('businessId');
      window.location.href = '/login';
      return { message: 'Session expired', code: 'UNAUTHORIZED' };

    case 403:
      // Access denied - likely businessId mismatch
      return {
        message: 'You do not have access to this resource',
        code: 'ACCESS_DENIED'
      };

    case 404:
      return {
        message: 'Resource not found',
        code: 'NOT_FOUND'
      };

    case 500:
      return {
        message: 'Server error. Please try again later.',
        code: 'SERVER_ERROR'
      };

    default:
      return {
        message: data.message || 'An error occurred',
        code: 'UNKNOWN_ERROR'
      };
  }
}
```

---

## 6. Multi-Business Handling

### Switching Between Businesses

```javascript
// services/businessSwitcher.js
export async function switchBusiness(businessId) {
  // Update localStorage
  localStorage.setItem('businessId', businessId);

  // Clear cached business-specific data
  localStorage.removeItem('customers_cache');
  localStorage.removeItem('orders_cache');

  // Reload data for new business
  // This depends on your caching strategy
  window.location.pathname = '/dashboard';
}
```

### Show Business Info in UI

```javascript
// components/BusinessHeader.jsx
import { useAuth } from '../hooks/useAuth';

export function BusinessHeader() {
  const { user, businessId } = useAuth();

  if (!businessId) {
    return null;
  }

  return (
    <div className="business-header">
      <span>Business: {user?.businessType}</span>
      <span className="business-id">ID: {businessId.slice(0, 8)}...</span>
    </div>
  );
}
```

---

## 7. Testing

### Mock API for Testing

```javascript
// __mocks__/api.js
export default {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
};
```

### Component Test

```javascript
// __tests__/CustomersPage.test.js
import { render, screen } from '@testing-library/react';
import { CustomersPage } from '../pages/Customers';
import * as CustomerAPI from '../services/customerApi';

jest.mock('../services/customerApi');
jest.mock('../hooks/useAuth');

it('should display customers for business', async () => {
  useAuth.mockReturnValue({
    businessId: 'business-123',
    isAuthenticated: true
  });

  CustomerAPI.getCustomers.mockResolvedValue({
    customers: [
      { _id: '1', name: 'John', phone: '123' },
      { _id: '2', name: 'Jane', phone: '456' }
    ],
    total: 2
  });

  render(<CustomersPage />);

  const rows = await screen.findAllByRole('row');
  expect(rows.length).toBe(3); // header + 2 customers
});
```

---

## 8. Environment Variables

### .env.local

```env
# Backend API
REACT_APP_API_URL=http://localhost:5000

# Feature flags
REACT_APP_ENABLE_BUSINESS_SWITCH=true
REACT_APP_DEBUG_MODE=false
```

---

## 9. Checklist

Frontend multi-tenant implementation checklist:

- [ ] Auth context stores businessId
- [ ] Login stores businessId in localStorage
- [ ] API interceptor adds businessId to requests
- [ ] All service methods pass businessId implicitly
- [ ] Protected routes check businessId exists
- [ ] Error handling for 403 (access denied)
- [ ] Error handling for 401 (unauthorized)
- [ ] Business info displayed in UI
- [ ] Logout clears businessId
- [ ] localStorage cleared properly on logout
- [ ] Tests mock businessId in auth context
- [ ] No hardcoded businessIds in components

---

## Troubleshooting

### Issue: businessId undefined in state

**Solution:**
```javascript
// Check storage after login
console.log(localStorage.getItem('businessId'));

// Verify interceptor is working
console.log(localStorage.getItem('businessId'));
```

### Issue: API returns 403 Access Denied

**Possible causes:**
1. businessId in JWT doesn't match URL businessId
2. businessId not sent in request body
3. Resource belongs to different business

**Debug:**
```javascript
console.log({
  storedBusinessId: localStorage.getItem('businessId'),
  requestData: { businessId: ... }
});
```

---

## Conclusion

Frontend multi-tenant implementation ensures:
- ✓ User can only access their business data
- ✓ businessId automatically injected in all requests
- ✓ Proper error handling for access violations
- ✓ Clean separation of business contexts
