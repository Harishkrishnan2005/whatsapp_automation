import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Enhanced Authentication Middleware
 * Validates JWT and injects user + tenant context
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required', code: 'TOKEN_REQUIRED' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token', code: 'INVALID_TOKEN' });
    }
    
    req.user = decoded;
    
    // Inject tenantId for multi-tenant isolation
    req.tenantId = decoded.tenantId || decoded.businessId;
    
    if (!req.tenantId && decoded.role !== 'super_admin') {
      return res.status(403).json({ 
        message: 'No business context found in token', 
        code: 'MISSING_TENANT_CONTEXT' 
      });
    }

    next();
  });
};

/**
 * Role-based access control helper
 */
const requireRole = (roles) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied: Requires one of [${allowedRoles.join(', ')}] roles`,
        code: 'INSUFFICIENT_ROLE'
      });
    }

    next();
  };
};

const isAdmin = requireRole(['admin', 'super_admin']);
const isStaff = requireRole(['staff', 'admin', 'super_admin']);
const isSuperAdmin = requireRole('super_admin');

/**
 * Permission check helper
 */
const hasPermission = (permission) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Admins bypass permission checks usually
      if (user.role === 'admin' || user.role === 'super_admin' || user.permissions.includes(permission)) {
        next();
      } else {
        return res.status(403).json({ message: 'Permission denied', code: 'PERMISSION_DENIED' });
      }
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  };
};

export { authenticateToken, requireRole, isAdmin, hasPermission, isStaff, isSuperAdmin };
