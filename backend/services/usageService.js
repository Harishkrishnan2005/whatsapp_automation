import Usage from '../models/Usage.js';
import Business from '../models/Business.js';
import ChatbotFlow from '../models/ChatbotFlow.js';
import { getBusinessPlanConfig, resolveBusinessPlan } from '../config/plans.js';

class UsageService {
  async incrementMessages(businessId) {
    try {
      const business = await Business.findById(businessId).select('subscription');
      if (!business) return;

      const plan = resolveBusinessPlan(business);
      const limit = getBusinessPlanConfig(business).maxMessages;

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

      const limit = getBusinessPlanConfig(business).maxMessages;

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
      const business = await Business.findById(businessId).select('plan subscription.plan').lean();
      const plan = resolveBusinessPlan(business);
      const config = getBusinessPlanConfig(business);

      const usage = await Usage.findOne({ businessId }).lean();
      
      const flowsCount = await ChatbotFlow.countDocuments({
        businessId,
        isActive: true,
        isSystem: false,
      });

      const maxFlows = config.maxFlows;
      const remainingFlows = maxFlows === Infinity ? Infinity : Math.max(0, maxFlows - flowsCount);

      return {
        messagesUsed: usage?.messagesUsed || 0,
        maxMessages: config.maxMessages,
        flowsCreated: flowsCount,
        maxFlows: maxFlows,
        remainingFlows: remainingFlows,
        total: maxFlows,
        used: flowsCount,
        remaining: remainingFlows,
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
