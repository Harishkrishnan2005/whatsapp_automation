import messageTemplateService from '../services/messageTemplateService.js';
import logger from '../utils/logger.js';

class MessageTemplateController {
  async listTemplates(req, res) {
    try {
      const templates = await messageTemplateService.listTemplatesForBusiness(req.businessId);

      return res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      logger.error('[MessageTemplateController] listTemplates error:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async createTemplate(req, res) {
    try {
      const { name, category, content, variables } = req.body || {};

      if (!name || !content) {
        return res.status(400).json({
          success: false,
          message: 'name and content are required',
        });
      }

      const template = await messageTemplateService.createTemplateForBusiness(req.businessId, {
        name,
        category,
        content,
        variables,
      });

      return res.status(201).json({
        success: true,
        data: template,
      });
    } catch (error) {
      logger.error('[MessageTemplateController] createTemplate error:', error);
      const status = error.message.includes('available only') ? 403 : 500;
      return res.status(status).json({
        success: false,
        message: error.message,
      });
    }
  }

  async updateTemplateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body || {};

      const template = await messageTemplateService.updateTemplateStatus(req.businessId, id, status);

      return res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      logger.error('[MessageTemplateController] updateTemplateStatus error:', error);
      const statusCode = error.message.includes('not found')
        ? 404
        : error.message.includes('Invalid')
          ? 400
          : 500;

      return res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default new MessageTemplateController();
