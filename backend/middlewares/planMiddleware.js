import { PLAN_CONFIG } from '../config/plans.js';
import Usage from '../models/Usage.js';
import User from '../models/User.js';

// Maps plan config keys → actual Usage model field names
const USAGE_FIELD_MAP = {
  maxFlows: 'flowsCreated',
  maxMessages: 'messagesUsed',
};

export const checkPlanFeature = (feature) => {
  return (req, res, next) => {
    // req.user is populated by authenticateToken
    const plan = req.user.plan || 'FREE';
    const status = req.user.subscriptionStatus || 'ACTIVE';
    const config = PLAN_CONFIG[plan];

    if (!config) {
      return res.status(403).json({ message: 'Plan configuration not found' });
    }

    if (status === 'EXPIRED' && feature !== 'allowAutomation') { // Allow basic automation even if expired? Or fallback to FREE?
       // If expired, the cron script should have downgraded them to FREE.
       // But if for some reason status is EXPIRED, we treat it as FREE but maybe more restricted.
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
      let currentUsage = 0;
      const limit = config[limitType];

      if (limitType === 'maxUsers') {
        currentUsage = await User.countDocuments({ businessId });
      } else {
        const usage = await Usage.findOne({ businessId });
        const usageField = USAGE_FIELD_MAP[limitType] || limitType;
        currentUsage = usage ? (usage[usageField] ?? 0) : 0;
      }

      if (limit !== Infinity && currentUsage >= limit) {
        const friendlyLimitName = limitType.replace('max', '').toLowerCase();
        return res.status(403).json({
          message: `You have reached the ${friendlyLimitName} limit (${limit}) for your ${plan} plan. Please upgrade to add more.`,
          code: 'LIMIT_REACHED',
          used: currentUsage,
          limit,
        });
      }

      next();
    } catch (error) {
      console.error('Usage limit check failed', error);
      res.status(500).json({ message: 'Failed to verify usage limits' });
    }
  };
};

