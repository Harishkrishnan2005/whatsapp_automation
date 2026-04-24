import ChatbotFlow from '../models/ChatbotFlow.js';
import Template from '../models/Template.js';
import Business from '../models/Business.js';
import { PLAN_CONFIG } from '../config/plans.js';
import logger from '../utils/logger.js';

/**
 * TemplateService
 * Handles template selection and auto-creation of flows
 */
class TemplateService {
  /**
   * Get all available templates for a business based on their plan
   */
  async getAvailableTemplates(businessId) {
    try {
      const business = await Business.findById(businessId);
      if (!business) {
        throw new Error('Business not found');
      }

      const plan = PLAN_CONFIG[business.subscription.plan];
      const availableTemplateNames = plan?.availableTemplates || [];

      const templates = await Template.find({
        tenantId: businessId,
        isActive: true,
      });

      return templates;
    } catch (error) {
      logger.error('Error getting available templates:', error);
      throw error;
    }
  }

  /**
   * Apply a template to a business
   * Creates all flows associated with the template
   */
  async applyTemplate(businessId, templateName, category = 'ecommerce') {
    try {
      // Validate business and plan
      const business = await Business.findById(businessId);
      if (!business) {
        throw new Error('Business not found');
      }

      const plan = PLAN_CONFIG[business.subscription.plan];
      const availableTemplates = plan?.availableTemplates || [];

      if (!availableTemplates.includes(templateName)) {
        throw new Error(`Template "${templateName}" not available for your plan`);
      }

      // Get template
      const template = await Template.findOne({
        name: templateName,
        tenantId: businessId,
        isActive: true,
      });

      if (!template) {
        throw new Error(`Template "${templateName}" not found`);
      }

      // Check flow limit
      const existingFlows = await ChatbotFlow.countDocuments({
        businessId,
        isDeleted: false,
      });

      const maxFlows = plan?.maxFlows || 1;
      const newFlowsCount = template.flows.length;

      if (existingFlows + newFlowsCount > maxFlows) {
        throw new Error(
          `Applying this template would exceed your flow limit (${maxFlows}). Current: ${existingFlows}, Required: ${newFlowsCount}`
        );
      }

      // Create all flows from template
      const createdFlows = [];
      for (const flowData of template.flows) {
        const flow = await ChatbotFlow.create({
          businessId,
          tenantId: businessId,
          category,
          trigger: flowData.trigger,
          reply: flowData.reply,
          step: flowData.step,
          nextStep: flowData.nextStep,
          action: flowData.action || 'JUST_SEND_REPLY',
          isActive: true,
          isDeleted: false,
        });
        createdFlows.push(flow);
      }

      logger.info(`Applied template "${templateName}" to business ${businessId}: created ${createdFlows.length} flows`);

      return {
        success: true,
        templateName,
        flowsCreated: createdFlows.length,
        flows: createdFlows,
      };
    } catch (error) {
      logger.error('Error applying template:', error);
      throw error;
    }
  }

  /**
   * Get template details with flow information
   */
  async getTemplateDetails(templateName) {
    try {
      const template = await Template.findOne({
        name: templateName,
        isActive: true,
      });

      if (!template) {
        throw new Error(`Template "${templateName}" not found`);
      }

      return template;
    } catch (error) {
      logger.error('Error getting template details:', error);
      throw error;
    }
  }

  /**
   * Create a new template (admin only)
   */
  async createTemplate(templateData) {
    try {
      const template = await Template.create({
        name: templateData.name,
        description: templateData.description,
        category: templateData.category,
        flows: templateData.flows,
        minPlan: templateData.minPlan || 'BASIC',
        tenantId: templateData.tenantId,
        isActive: true,
      });

      logger.info(`Template "${template.name}" created`);
      return template;
    } catch (error) {
      logger.error('Error creating template:', error);
      throw error;
    }
  }
}

export default new TemplateService();
