import Customer from '../models/Customer.js';
import Message from '../models/Message.js';
import Business from '../models/Business.js';
import ChatbotEngine from './chatbotEngine.js';

class WebhookService {
  async resolveBusinessId(inputBusinessId) {
    if (inputBusinessId) {
      return inputBusinessId;
    }

    const defaultBusiness = await Business.findOne().select('_id').lean();
    if (!defaultBusiness?._id) {
      throw new Error('No business found. Please create/seed a business before using webhook.');
    }

    return defaultBusiness._id;
  }

  async handleIncomingMessage(phone, message, businessId) {
    const resolvedBusinessId = await this.resolveBusinessId(businessId);

    let customer = await Customer.findOne({ phone, businessId: resolvedBusinessId });
    if (!customer) {
      customer = await Customer.create({ phone, chatState: 'ASK_NAME', businessId: resolvedBusinessId });
    }

    const incomingText = String(message ?? '').trim();
    if (!incomingText) {
      return {
        response: 'Please type a message to continue.',
      };
    }

    // Save incoming message
    await Message.create({
      customerId: customer._id,
      message: incomingText,
      type: 'incoming',
      businessId: resolvedBusinessId,
    });

    const result = await ChatbotEngine.chatbotEngine({ phone, message: incomingText, businessId: resolvedBusinessId });

    await Message.create({
      customerId: customer._id,
      message: result.text,
      type: 'outgoing',
      campaignId: customer.lastCampaignId || null,
      businessId: resolvedBusinessId,
    });

    return result;
  }
}

export default new WebhookService();
