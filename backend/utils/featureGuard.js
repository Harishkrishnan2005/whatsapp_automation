import subscriptionService from '../services/subscriptionService.js';
import Usage from '../models/Usage.js';
import Flow from '../models/Flow.js';
import User from '../models/User.js';

/**
 * Feature Guard utility to enforce plan limits
 */
export const checkPlanLimits = async (businessId) => {
  const sub = await subscriptionService.getActiveSubscription(businessId);
  const plan = sub.plan;
  
  const usage = await Usage.findOne({ businessId }) || await Usage.create({ 
    businessId, 
    lastResetDate: new Date(),
    messagesUsed: 0,
    flowsUsed: 0
  });

  // Monthly Reset Logic
  const now = new Date();
  const resetDate = new Date(usage.lastResetDate);
  const diffDays = Math.ceil((now - resetDate) / (1000 * 60 * 60 * 24));
  
  if (diffDays >= 30) {
    usage.messagesUsed = 0;
    usage.lastResetDate = now;
    await usage.save();
  }
  
  return {
    plan,
    usage,
    canCreateFlow: async () => {
      const currentFlows = await Flow.countDocuments({ businessId });
      const limit = await subscriptionService.checkFeature(businessId, 'maxFlows');
      return currentFlows < limit;
    },
    canSendMessage: async () => {
      const limit = await subscriptionService.checkFeature(businessId, 'monthlyMessages');
      return usage.messagesUsed < limit;
    },
    canAddStaff: async () => {
      const staffCount = await User.countDocuments({ businessId, role: 'staff' });
      const limit = await subscriptionService.checkFeature(businessId, 'staffLimit');
      return staffCount < limit;
    }
  };
};

export const getFeatureValue = async (businessId, feature) => {
  return await subscriptionService.checkFeature(businessId, feature);
};
