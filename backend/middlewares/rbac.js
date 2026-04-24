/**
 * RBAC Middleware
 * Restricts access based on user roles.
 */

export const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied: Insufficient permissions',
        code: 'INSUFFICIENT_ROLE'
      });
    }

    next();
  };
};

// Common role checks
export const isAdmin = authorize(['admin', 'super_admin']);
export const isStaff = authorize(['staff', 'admin', 'super_admin']);
export const isSuperAdmin = authorize(['super_admin']);
