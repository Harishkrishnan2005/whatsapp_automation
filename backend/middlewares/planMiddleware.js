import { PLAN_CONFIG } from '../config/plans.js';
import Usage from '../models/Usage.js';

export const checkPlanFeature = (feature) => {
  return (req, res, next) => {
    // req.user is populated by authenticateToken
    const plan = req.user.plan || 'FREE';
    const config = PLAN_CONFIG[plan];

    if (!config) {
      return res.status(403).json({ message: 'Plan configuration not found' });
    }

    if (!config[feature]) {
      return res.status(403).json({
        message: `Your current plan (${plan}) does not support this feature. Please upgrade.`,
        code: 'FEATURE_LOCKED'
      });
    }

    next();
  };
};

export const checkUsageLimit = (limitType) => {
  return async (req, res, next) => {
    const plan = req.user.plan || 'FREE';
    const businessId = req.user.businessId;
    const config = PLAN_CONFIG[plan];

    if (!config) {
      return res.status(403).json({ message: 'Plan configuration not found' });
    }

    try {
      const usage = await Usage.findOne({ businessId });
      const currentUsage = usage ? usage[limitType] : 0;
      const limit = config[limitType];

      if (limit !== Infinity && currentUsage >= limit) {
        return res.status(403).json({
          message: `${limitType} limit reached for your ${plan} plan. Please upgrade to continue.`,
          code: 'LIMIT_REACHED'
        });
      }

      next();
    } catch (error) {
      console.error('Usage limit check failed', error);
      res.status(500).json({ message: 'Failed to verify usage limits' });
    }
  };
};
