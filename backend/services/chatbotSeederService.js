import Business from '../models/Business.js';
import Flow from '../models/Flow.js';
import { FLOW_GROUPS, PLAN_FLOW_ACCESS } from '../config/flowGroups.js';
import { getPlanConfig, resolvePlanName } from '../config/plans.js';
import messageTemplateService from './messageTemplateService.js';
import { resolveFlowTemplateConfig } from '../utils/flowTemplateConfig.js';
import logger from '../utils/logger.js';

class ChatbotSeederService {
  normalizeCategory(value = 'ecommerce') {
    const normalized = String(value || 'ecommerce').trim().toLowerCase();
    if (normalized === 'booking') return 'booking';
    return 'ecommerce';
  }

  async resolveBusinessContext(businessOrId, explicitPlan = null) {
    if (businessOrId && typeof businessOrId === 'object' && businessOrId._id) {
      return {
        businessId: businessOrId._id,
        plan: explicitPlan || businessOrId.plan || businessOrId.subscription?.plan || 'FREE',
        category: this.normalizeCategory(
          businessOrId.category || businessOrId.business_type || businessOrId.businessType
        ),
      };
    }

    const business = await Business.findById(businessOrId)
      .select('_id plan subscription.plan category business_type businessType')
      .lean();

    if (!business?._id) {
      throw new Error('Business not found for flow seeding');
    }

    return {
      businessId: business._id,
      plan: explicitPlan || business.plan || business.subscription?.plan || 'FREE',
      category: this.normalizeCategory(
        business.category || business.business_type || business.businessType
      ),
    };
  }

  shouldIncludeGroupForCategory(groupName, category) {
    if (groupName === 'BASIC_DEMO') {
      return true;
    }

    if (category === 'ecommerce') {
      return groupName.includes('ECOMMERCE');
    }

    if (category === 'booking') {
      return groupName.includes('BOOKING');
    }

    return true;
  }

  getFlowsForPlan(plan, category = 'ecommerce') {
    const allowedGroups = PLAN_FLOW_ACCESS[plan] || PLAN_FLOW_ACCESS.FREE;
    console.log('PLAN:', plan);
    console.log('CATEGORY:', category);
    console.log('GROUPS:', allowedGroups);

    let flows = [];

    if (allowedGroups === 'ALL') {
      flows = Object.entries(FLOW_GROUPS)
        .filter(([groupName]) => this.shouldIncludeGroupForCategory(groupName, category))
        .flatMap(([, groupFlows]) => groupFlows);
    } else {
      allowedGroups.forEach((group) => {
        if (FLOW_GROUPS[group] && this.shouldIncludeGroupForCategory(group, category)) {
          flows.push(...FLOW_GROUPS[group]);
        }
      });
    }

    console.log('TOTAL FLOWS:', flows.length);
    return flows;
  }

  ensureUniqueSteps(flows) {
    const seen = new Set();

    for (const flow of flows) {
      if (seen.has(flow.step)) {
        throw new Error(`Duplicate step detected in seed data: ${flow.step}`);
      }
      seen.add(flow.step);
    }
  }

  async seedFlowsForBusiness(businessOrId, explicitPlan = null) {
    try {
      const { businessId, plan, category } = await this.resolveBusinessContext(businessOrId, explicitPlan);
      const normalizedPlan = resolvePlanName(plan);
      const planConfig = getPlanConfig(normalizedPlan);
      await messageTemplateService.seedDefaultTemplates();
      const flows = this.getFlowsForPlan(normalizedPlan, category);
      this.ensureUniqueSteps(flows);

      await Flow.deleteMany({ businessId });

      const mappedFlows = flows.map((flow) => ({
        ...resolveFlowTemplateConfig(flow),
        businessId,
      }));
      const finalFlows = Number.isFinite(planConfig.maxFlows)
        ? mappedFlows.slice(0, planConfig.maxFlows)
        : mappedFlows;

      this.ensureUniqueSteps(finalFlows);

      if (finalFlows.length > 0) {
        await Flow.insertMany(finalFlows);
      }

      const count = await Flow.countDocuments({ businessId });
      console.log('Inserted flows:', count);
      logger.info(`[SEEDER] Successfully seeded ${count} ${category} flows for business: ${businessId} (${normalizedPlan})`);

      return { success: true, count, plan: normalizedPlan, category };
    } catch (error) {
      logger.error(`[SEEDER] Error seeding flows:`, error);
      throw error;
    }
  }

  async seedForCategory(businessId, category = 'ecommerce') {
    try {
      return await this.seedFlowsForBusiness({ _id: businessId, category, plan: 'FREE' }, 'FREE');
    } catch (error) {
      logger.error(`[SEEDER] Initial seeding failed for category ${category}:`, error);
      throw error;
    }
  }
}

export default new ChatbotSeederService();
