import templateService from '../services/templateService.js';
import { PLAN_CONFIG } from '../config/plans.js';
import logger from '../utils/logger.js';

/**
 * TemplateController
 * Handles template operations
 */
class TemplateController {
  /**
   * Get available templates for the current business
   * GET /api/templates
   */
  static async getAvailableTemplates(req, res) {
    try {
      const { businessId } = req.user;

      const templates = await templateService.getAvailableTemplates(businessId);

      return res.json({
        success: true,
        message: 'Available templates retrieved',
        data: templates,
      });
    } catch (error) {
      logger.error('Error getting available templates:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get template details
   * GET /api/templates/:templateName
   */
  static async getTemplateDetails(req, res) {
    try {
      const { templateName } = req.params;

      const template = await templateService.getTemplateDetails(templateName);

      return res.json({
        success: true,
        message: 'Template retrieved',
        data: template,
      });
    } catch (error) {
      logger.error('Error getting template details:', error);
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Apply a template to the current business
   * POST /api/templates/:templateName/apply
   */
  static async applyTemplate(req, res) {
    try {
      const { businessId } = req.user;
      const { templateName } = req.params;
      const { category = 'ecommerce' } = req.body;

      const result = await templateService.applyTemplate(
        businessId,
        templateName,
        category
      );

      return res.json({
        success: true,
        message: `Template "${templateName}" applied successfully`,
        data: result,
      });
    } catch (error) {
      logger.error('Error applying template:', error);
      const statusCode = error.message.includes('exceed') ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Create a new template (Admin only)
   * POST /api/templates
   */
  static async createTemplate(req, res) {
    try {
      const { role } = req.user;

      // Only admins can create templates
      if (role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admins can create templates',
        });
      }

      const { name, description, category, flows, minPlan } = req.body;

      // Validate required fields
      if (!name || !category || !flows || !Array.isArray(flows) || flows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'name, category, and flows array are required',
        });
      }

      const template = await templateService.createTemplate({
        name,
        description,
        category,
        flows,
        minPlan,
        tenantId: req.user.businessId,
      });

      return res.status(201).json({
        success: true,
        message: 'Template created successfully',
        data: template,
      });
    } catch (error) {
      logger.error('Error creating template:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default TemplateController;
