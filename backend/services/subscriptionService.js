import Subscription from '../models/Subscription.js';
import Usage from '../models/Usage.js';
import Business from '../models/Business.js';
import { PLAN_CONFIG, getPlanPrice } from '../config/plans.js';
import logger from '../utils/logger.js';

class SubscriptionService {
  /**
   * Get active subscription for a business
   * If none or expired, defaults to FREE
   */
  async getActiveSubscription(businessId) {
    const sub = await Subscription.findOne({
      businessId,
      status: 'ACTIVE',
      endDate: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!sub) {
      return { plan: "FREE", status: "ACTIVE" };
    }

    return sub;
  }

  /**
   * Check if a plan transition is an upgrade
   */
  isUpgrade(currentPlan, newPlan) {
    const planWeight = {
      'FREE': 0,
      'BASIC': 1,
      'PRO': 2,
      'ENTERPRISE': 3
    };
    return planWeight[newPlan] > planWeight[currentPlan];
  }

  /**
   * Handle subscription purchase logic
   * Supports same-plan prevention, upgrades, and downgrade blocking
   */
  async handleSubscriptionPurchase(businessId, newPlan, paymentId) {
    const activeSub = await Subscription.findOne({
      businessId,
      status: 'ACTIVE',
      endDate: { $gt: new Date() }
    });

    if (activeSub) {
      // SAME PLAN BLOCK
      if (activeSub.plan === newPlan) {
        throw new Error("Plan already active");
      }

      // UPGRADE FLOW
      if (this.isUpgrade(activeSub.plan, newPlan)) {
        activeSub.status = "CANCELLED";
        await activeSub.save();
        return this.createNewSubscription(businessId, newPlan, paymentId);
      }

      // DOWNGRADE BLOCK
      throw new Error("Downgrade allowed after expiry");
    }

    return this.createNewSubscription(businessId, newPlan, paymentId);
  }

  /**
   * Create a new subscription record
   */
  async createNewSubscription(businessId, plan, paymentId) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 30); // 30 days validity

    const subscription = new Subscription({
      businessId,
      plan,
      status: "ACTIVE",
      startDate,
      endDate,
      paymentId,
      amount: getPlanPrice(plan)
    });

    await subscription.save();

    // Update Business model cache
    await Business.findByIdAndUpdate(businessId, {
      plan,
      'subscription.plan': plan,
      'subscription.status': 'ACTIVE',
      'subscription.expiryDate': endDate
    });

    // Reset usage for new billing cycle
    await this.resetUsage(businessId);

    return subscription;
  }

  /**
   * Reset usage tracking for a business
   */
  async resetUsage(businessId) {
    await Usage.findOneAndUpdate(
      { businessId },
      {
        messagesUsed: 0,
        lastResetDate: new Date()
      },
      { upsert: true, new: true }
    );
  }

  /**
   * Check feature access based on active plan
   */
  async checkFeature(businessId, feature) {
    const sub = await this.getActiveSubscription(businessId);
    const plan = sub.plan;
    return PLAN_CONFIG[plan][feature];
  }
}

export default new SubscriptionService();
