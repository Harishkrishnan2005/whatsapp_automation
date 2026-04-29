import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Enhanced Authentication Middleware
 * Validates JWT and injects user + tenant context
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required', code: 'TOKEN_REQUIRED' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const liveUser = await User.findById(decoded.id)
      .select('email role businessId tenantId businessType permissions isActive status staffRole name')
      .lean();

    if (!liveUser) {
      return res.status(401).json({ message: 'User not found', code: 'USER_NOT_FOUND' });
    }

    if (liveUser.role === 'staff' && (liveUser.status === 'INACTIVE' || liveUser.isActive === false)) {
      return res.status(403).json({ message: 'Staff account is inactive', code: 'STAFF_INACTIVE' });
    }

    req.user = {
      ...decoded,
      id: String(liveUser._id),
      email: liveUser.email,
      role: liveUser.role,
      businessId: liveUser.businessId || decoded.businessId,
      tenantId: liveUser.tenantId || decoded.tenantId || liveUser.businessId,
      businessType: liveUser.businessType || decoded.businessType,
      permissions: Array.isArray(liveUser.permissions) ? liveUser.permissions : [],
      isActive: liveUser.isActive,
      status: liveUser.status,
      staffRole: liveUser.staffRole || null,
      name: liveUser.name,
    };

    req.tenantId = req.user.tenantId || req.user.businessId;

    if (!req.tenantId && req.user.role !== 'super_admin') {
      return res.status(403).json({
        message: 'No business context found in token',
        code: 'MISSING_TENANT_CONTEXT',
      });
    }

    req.businessId = req.tenantId;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token', code: 'INVALID_TOKEN' });
  }
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
