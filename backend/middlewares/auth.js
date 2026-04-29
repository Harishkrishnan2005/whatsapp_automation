import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const liveUser = await User.findById(decoded.id)
      .select('email role businessId tenantId businessType permissions isActive status staffRole name')
      .lean();

    if (!liveUser) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (liveUser.role === 'staff' && (liveUser.status === 'INACTIVE' || liveUser.isActive === false)) {
      return res.status(403).json({ message: 'Staff account is inactive' });
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
    req.businessId = req.tenantId;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

export { authenticateToken };
