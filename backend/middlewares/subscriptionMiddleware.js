import Business from '../models/Business.js';
import ChatbotFlow from '../models/ChatbotFlow.js';
import Campaign from '../models/Campaign.js';
import User from '../models/User.js';

/**
 * Middleware to check feature limits based on subscription plan
 */
export const checkFeatureLimit = (feature) => {
  return async (req, res, next) => {
    try {
      const businessId = req.businessId || req.user.businessId;
      if (!businessId) return res.status(401).json({ message: 'Business context required' });

      const business = await Business.findById(businessId).select('subscription').lean();
      const limits = business?.subscription?.features || {
        maxFlows: 5,
        maxCampaigns: 1,
        maxUsers: 2,
      };

      let currentCount = 0;

      switch (feature) {
        case 'flows':
          currentCount = await ChatbotFlow.countDocuments({ businessId });
          if (currentCount >= (limits.maxFlows || 5)) {
            return res.status(403).json({ 
              message: 'Flow limit reached for your plan. Upgrade for more.',
              limit: limits.maxFlows 
            });
          }
          break;
        case 'campaigns':
          currentCount = await Campaign.countDocuments({ businessId });
          if (currentCount >= (limits.maxCampaigns || 1)) {
            return res.status(403).json({ 
              message: 'Campaign limit reached for your plan.',
              limit: limits.maxCampaigns 
            });
          }
          break;
        case 'users':
          currentCount = await User.countDocuments({ businessId });
          if (currentCount >= (limits.maxUsers || 2)) {
            return res.status(403).json({ 
              message: 'User seat limit reached for your plan.',
              limit: limits.maxUsers 
            });
          }
          break;
        case 'advanced_analytics':
          if (business?.subscription?.features?.analyticsLevel !== 'advanced') {
            return res.status(403).json({ message: 'Advanced analytics requires Pro plan.' });
          }
          break;
      }

      next();
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };
};
