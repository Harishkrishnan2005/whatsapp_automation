import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Role-based access control helper
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Access token required' });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ message: 'Access denied' });
    }

    next();
  };
};

const isAdmin = requireRole('admin');
const isStaff = requireRole('staff');
const isSuperAdmin = requireRole('super_admin');

// Check if user has specific permission
const hasPermission = (permission) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.role === 'admin' || user.permissions.includes(permission)) {
        next();
      } else {
        return res.status(403).json({ message: 'Permission denied' });
      }
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  };
};

export { authenticateToken, requireRole, isAdmin, hasPermission, isStaff, isSuperAdmin };
