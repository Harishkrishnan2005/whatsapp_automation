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

// Check if user has admin role
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

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

// Check if user is staff
const isStaff = (req, res, next) => {
  if (!req.user || req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Staff access required' });
  }
  next();
};

export { authenticateToken, isAdmin, hasPermission, isStaff };
