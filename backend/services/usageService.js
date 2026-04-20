import Usage from '../models/Usage.js';
import Business from '../models/Business.js';
import { PLAN_CONFIG } from '../config/plans.js';

class UsageService {
  async incrementMessages(businessId) {
    try {
      const business = await Business.findById(businessId).select('subscription');
      if (!business) return;

      const plan = business.subscription.plan || 'FREE';
      const limit = PLAN_CONFIG[plan].maxMessages;

      const usage = await Usage.findOneAndUpdate(
        { businessId },
        {
          $inc: { messagesUsed: 1 },
          $setOnInsert: { resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
        },
        { upsert: true, new: true }
      );

      return {
        isExceeded: limit !== Infinity && usage.messagesUsed > limit,
        used: usage.messagesUsed,
        limit
      };
    } catch (error) {
      console.error('Failed to increment messages', error);
    }
  }

  async incrementFlows(businessId) {
    try {
      await Usage.findOneAndUpdate(
        { businessId },
        {
          $inc: { flowsCreated: 1 },
          $setOnInsert: { resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
        },
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error('Failed to increment flows', error);
    }
  }

  async decrementFlows(businessId) {
    try {
      await Usage.findOneAndUpdate(
        { businessId },
        { $inc: { flowsCreated: -1 } },
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error('Failed to decrement flows', error);
    }
  }

  async canSendMessages(businessId, count = 1) {
    try {
      const business = await Business.findById(businessId).select('subscription');
      if (!business) return false;

      const plan = business.subscription.plan || 'FREE';
      const limit = PLAN_CONFIG[plan].maxMessages;

      if (limit === Infinity) return true;

      const usage = await Usage.findOne({ businessId });
      const used = usage ? usage.messagesUsed : 0;

      return (used + count) <= limit;
    } catch (error) {
      console.error('Failed to check message limit', error);
      return false;
    }
  }

  async resetMonthlyUsage() {
    try {
      const now = new Date();
      await Usage.updateMany(
        { resetDate: { $lte: now } },
        {
          messagesUsed: 0,
          resetDate: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
        }
      );
      console.log('Monthly usage reset completed');
    } catch (error) {
      console.error('Monthly usage reset failed', error);
    }
  }

  async getUsage(businessId) {
    try {
      const business = await Business.findById(businessId).select('subscription').lean();
      const plan = business?.subscription?.plan || 'FREE';
      const config = PLAN_CONFIG[plan];

      const usage = await Usage.findOne({ businessId }).lean();
      
      return {
        messagesUsed: usage?.messagesUsed || 0,
        maxMessages: config.maxMessages,
        flowsCreated: usage?.flowsCreated || 0,
        maxFlows: config.maxFlows,
        resetDate: usage?.resetDate,
        plan
      };
    } catch (error) {
      console.error('Failed to get usage', error);
      throw error;
    }
  }
}

export default new UsageService();
