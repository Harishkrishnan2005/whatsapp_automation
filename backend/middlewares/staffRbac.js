import { ACCESS_AREAS, hasAreaAccess } from '../utils/staffAccess.js';

export const requireAreaAccess = (area) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!hasAreaAccess(req.user, area)) {
    return res.status(403).json({
      message: `Access denied for ${area}`,
      code: 'RBAC_ACCESS_DENIED',
    });
  }

  next();
};

export const requireSupportAccess = requireAreaAccess(ACCESS_AREAS.TICKETS);
export const requireChatAccess = requireAreaAccess(ACCESS_AREAS.CHAT);
export const requireSalesAccess = requireAreaAccess(ACCESS_AREAS.ORDERS);
export const requireMarketingAccess = requireAreaAccess(ACCESS_AREAS.CAMPAIGNS);
export const requireFeedbackAccess = requireAreaAccess(ACCESS_AREAS.FEEDBACK);
