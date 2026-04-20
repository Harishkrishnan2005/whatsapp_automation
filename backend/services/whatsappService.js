import axios from 'axios';
import Business from '../models/Business.js';
import usageService from './usageService.js';

class WhatsAppService {
  constructor() {
    this.baseUrl = 'https://graph.facebook.com/v19.0';
  }

  /**
   * Get WhatsApp config for a business
   * @param {string} businessId 
   */
  async getConfig(businessId) {
    const business = await Business.findById(businessId).select('whatsappConfig').lean();
    if (!business?.whatsappConfig?.isActive) {
      throw new Error('WhatsApp Cloud API is not configured or active for this business');
    }
    return business.whatsappConfig;
  }

  /**
   * Send a text message via WhatsApp Cloud API
   */
  async sendTextMessage(businessId, to, text) {
    try {
      // 1. Quota Check
      const hasQuota = await usageService.canSendMessages(businessId);
      if (!hasQuota) {
        throw new Error('LIMIT_REACHED: Monthly message quota exceeded');
      }

      const config = await this.getConfig(businessId);
      const { phoneNumberId, accessToken } = config;

      const url = `${this.baseUrl}/${phoneNumberId}/messages`;
      
      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'text',
          text: { body: text },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // 2. Increment usage count
      await usageService.incrementMessages(businessId);

      return response.data;
    } catch (error) {
      console.error('[WhatsAppService] sendTextMessage error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send a template message
   */
  async sendTemplateMessage(businessId, to, templateName, languageCode = 'en_US', components = []) {
    try {
      // 1. Quota Check
      const hasQuota = await usageService.canSendMessages(businessId);
      if (!hasQuota) {
        throw new Error('LIMIT_REACHED: Monthly message quota exceeded');
      }

      const config = await this.getConfig(businessId);
      const { phoneNumberId, accessToken } = config;

      const url = `${this.baseUrl}/${phoneNumberId}/messages`;

      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            components: components,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // 2. Increment usage count
      await usageService.incrementMessages(businessId);

      return response.data;
    } catch (error) {
      console.error('[WhatsAppService] sendTemplateMessage error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send interactive message (List or Buttons)
   */
  async sendInteractiveMessage(businessId, to, interactiveData) {
    try {
      // 1. Quota Check
      const hasQuota = await usageService.canSendMessages(businessId);
      if (!hasQuota) {
        throw new Error('LIMIT_REACHED: Monthly message quota exceeded');
      }

      const config = await this.getConfig(businessId);
      const { phoneNumberId, accessToken } = config;

      const url = `${this.baseUrl}/${phoneNumberId}/messages`;

      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'interactive',
          interactive: interactiveData,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // 2. Increment usage count
      await usageService.incrementMessages(businessId);

      return response.data;
    } catch (error) {
      console.error('[WhatsAppService] sendInteractiveMessage error:', error.response?.data || error.message);
      throw error;
    }
  }
}

export default new WhatsAppService();
