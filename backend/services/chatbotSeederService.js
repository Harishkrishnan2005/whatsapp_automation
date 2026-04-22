import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ChatbotFlow from '../models/ChatbotFlow.js';
import Business from '../models/Business.js';
import { resolvePlanName } from '../config/plans.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ChatbotSeederService {
  /**
   * Seed chatbot flows for a business based on their plan
   * @param {string} businessId 
   * @param {string} plan 
   */
  async seedFlowsForBusiness(businessId, plan) {
    try {
      const business = await Business.findById(businessId);
      if (!business) {
        throw new Error(`Business not found for ID: ${businessId}`);
      }

      const category = (business.category || 'ecommerce').toLowerCase();
      const resolvedPlan = resolvePlanName(plan || business.plan || business.subscription?.plan || 'FREE');
      
      // 1. Delete existing non-system flows
      await ChatbotFlow.deleteMany({
        businessId,
        isSystem: false
      });

      // 2. Load seed JSON based on plan + category
      let seedData = [];
      const planLower = resolvedPlan.toLowerCase();
      
      // Map 'free' to 'basic' for seeding if dedicated free seeds don't exist
      const sourcePlan = planLower === 'free' ? 'basic' : planLower;
      const seedFileName = `${sourcePlan}-${category}.json`;
      const seedPath = path.join(__dirname, '../seeds', seedFileName);

      if (fs.existsSync(seedPath)) {
        const rawData = fs.readFileSync(seedPath, 'utf8');
        seedData = JSON.parse(rawData);
        
        // If it was a FREE plan, we only seed the first flow to respect plan limits
        if (planLower === 'free') {
          seedData = seedData.slice(0, 1);
          logger.info(`[SEEDER] FREE plan detected. Seeding only the first flow from ${seedFileName}`);
        }
      } else {
        logger.warn(`Seed file not found: ${seedFileName}. Defaulting to empty flows.`);
      }

      // 3. Prepare flows with businessId and isActive = true
      const flowsToInsert = seedData.map(flow => ({
        ...flow,
        businessId,
        category,
        isActive: true,
        isSystem: false
      }));

      // 4. Ensure system flows exist
      const systemFlows = [
        {
          businessId,
          category,
          step: '*',
          triggerKeywords: ['menu'],
          responseTemplate: 'Main Menu:\nType "hi" to start over.',
          nextStep: 'menu',
          action: 'NONE',
          isActive: true,
          isSystem: true
        },
        {
          businessId,
          category,
          step: 'system',
          triggerKeywords: ['*'],
          responseTemplate: 'We will respond within 24 hrs',
          nextStep: 'start',
          action: 'NONE',
          isActive: true,
          isSystem: true
        }
      ];

      // Upsert system flows
      for (const sysFlow of systemFlows) {
        await ChatbotFlow.findOneAndUpdate(
          { businessId, step: sysFlow.step, isSystem: true },
          sysFlow,
          { upsert: true, new: true }
        );
      }

      // 5. Insert plan flows
      if (flowsToInsert.length > 0) {
        await ChatbotFlow.insertMany(flowsToInsert);
      }

      logger.info(`[SEEDER] Successfully seeded ${flowsToInsert.length} flows for business ${businessId} (${resolvedPlan})`);
      return { success: true, count: flowsToInsert.length };
    } catch (error) {
      logger.error(`[SEEDER] Error seeding flows for business ${businessId}:`, error);
      throw error;
    }
  }

  /**
   * Seed initial flows based on category (used during signup)
   */
  async seedForCategory(businessId, category = 'ecommerce') {
    try {
      // For new signups, we default to FREE plan which only has system flows
      await this.seedFlowsForBusiness(businessId, 'FREE');
    } catch (error) {
       logger.error(`[SEEDER] Initial seeding failed:`, error);
    }
  }
}

export default new ChatbotSeederService();

