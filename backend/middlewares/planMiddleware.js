import { PLAN_CONFIG, getPlanConfig, resolveBusinessPlan } from '../config/plans.js';
import logger from '../utils/logger.js';

import Usage from '../models/Usage.js';
import User from '../models/User.js';
import ChatbotFlow from '../models/ChatbotFlow.js';
import Business from '../models/Business.js';

// Maps plan config keys → actual Usage model field names
const USAGE_FIELD_MAP = {
  maxFlows: 'flowsCreated',
  maxMessages: 'messagesUsed',
};

const FEATURE_ALIASES = {
  allowAdvancedAnalytics: 'advancedAnalytics',
  allowCampaigns: 'campaigns',
  allowAutomation: 'automation',
};

/**
 * Enforce flow limits per plan
 * Counts only active, non-system flows
 */
export const checkFlowLimit = async (req, res, next) => {
  try {
    const businessId = req.businessId || req.user?.businessId;
    const business = await Business.findById(businessId).select('plan subscription.plan').lean();
    const plan = resolveBusinessPlan(business);
    const config = getPlanConfig(plan);

    const count = await ChatbotFlow.countDocuments({
      businessId,
      isActive: true,
      isSystem: false,
    });

    if (config.maxFlows !== Infinity && count >= config.maxFlows) {
      return res.status(403).json({
        code: "FLOW_LIMIT_REACHED",
        message: "Upgrade your plan to add more flows"
      });
    }

    next();
  } catch (error) {
    logger.error('Flow limit check failed:', error);
    res.status(500).json({ message: 'Internal server error while checking limits' });
  }
};

export const checkPlanFeature = (feature) => {
  return async (req, res, next) => {
    try {
      const businessId = req.businessId || req.user?.businessId;
      const business = businessId
        ? await Business.findById(businessId).select('plan subscription.plan subscription.status').lean()
        : null;

      const plan = resolveBusinessPlan(business) || req.user?.plan || 'FREE';
      const status = business?.subscription?.status || req.user?.subscriptionStatus || 'ACTIVE';
      const config = PLAN_CONFIG[plan];
      const normalizedFeature = FEATURE_ALIASES[feature] || feature;

      if (!config) {
        return res.status(403).json({ message: 'Plan configuration not found' });
      }

      if (status === 'EXPIRED' && normalizedFeature !== 'automation') {
        return res.status(403).json({
          message: `Your subscription is expired. Please renew to access this feature.`,
          code: 'SUBSCRIPTION_EXPIRED',
        });
      }

      const featureEnabled =
        config?.features?.[normalizedFeature]?.enabled ??
        config?.[normalizedFeature] ??
        config?.[feature];

      if (!featureEnabled) {
        return res.status(403).json({
          message: `Your current plan (${plan}) does not support this feature. Please upgrade.`,
          code: 'FEATURE_LOCKED'
        });
      }

      next();
    } catch (error) {
      logger.error('Plan feature check failed:', error);
      res.status(500).json({ message: 'Failed to verify plan feature access' });
    }
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
      logger.error('Usage limit check failed:', error);
      res.status(500).json({ message: 'Failed to verify usage limits' });
    }
  };
};
