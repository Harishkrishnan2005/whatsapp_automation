import Template from '../models/Template.js';
import logger from '../utils/logger.js';

class TemplateEngine {
  /**
   * Determine if we should send a template or plain text
   * @param {Object} session - The current chat session
   * @param {String} fallbackText - The default text to send
   * @returns {Object} { type: 'text'|'template', content: String, templateName?: String }
   */
  async getResponse(session, fallbackText) {
    const now = new Date();
    const lastInteraction = session.lastInteractionAt ? new Date(session.lastInteractionAt) : null;
    
    // 24-hour rule: If last interaction was more than 24 hours ago, we MUST use a template for WhatsApp
    const isOutsideWindow = !lastInteraction || (now - lastInteraction) > (24 * 60 * 60 * 1000);

    if (isOutsideWindow) {
      logger.info(`[TemplateEngine] Session ${session.phone} outside 24h window. Fetching approved template.`);
      
      // Fetch the primary approved template for this business
      const template = await Template.findOne({
        tenantId: session.businessId,
        status: 'approved'
      }).sort({ createdAt: -1 }).lean();

      if (template) {
        return {
          type: 'template',
          content: template.body,
          templateName: template.name,
          isOutsideWindow: true
        };
      }
      
      // If no template found, return a generic warning or the fallback
      return {
        type: 'text',
        content: "It's been a while! How can we help you today?",
        isOutsideWindow: true
      };
    }

    // Inside window, send regular text
    return {
      type: 'text',
      content: fallbackText,
      isOutsideWindow: false
    };
  }

  /**
   * Replace placeholders in templates
   */
  interpolate(text, data = {}) {
    return text.replace(/{{(\w+)}}/g, (match, key) => data[key] || match);
  }
}

export default new TemplateEngine();
