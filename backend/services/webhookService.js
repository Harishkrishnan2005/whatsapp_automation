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
      customer = await Customer.create({ 
        phone, 
        chatState: 'ASK_NAME', 
        businessId: resolvedBusinessId,
        tenantId: resolvedBusinessId
      });
    }

    const incomingText = String(message ?? '').trim();
    if (!incomingText) {
      return {
        response: 'Please type a message to continue.',
      };
    }

    // Ensure conversation exists for tracking
    const chatService = (await import('./chatService.js')).default;
    const conversation = await chatService.getOrCreateConversation(resolvedBusinessId, customer._id, phone);

    // Save incoming message
    await Message.create({
      customerId: customer._id,
      businessId: resolvedBusinessId,
      tenantId: resolvedBusinessId,
      content: incomingText,
      message: incomingText,
      type: 'incoming',
      senderType: 'customer',
      sender: customer._id,
      senderModel: 'Customer',
      receiver: resolvedBusinessId,
      receiverModel: 'Business',
      conversationId: conversation._id,
      status: 'delivered'
    });

    const result = await ChatbotEngine.chatbotEngine({ phone, message: incomingText, businessId: resolvedBusinessId });

    // Save outgoing message
    await Message.create({
      customerId: customer._id,
      businessId: resolvedBusinessId,
      tenantId: resolvedBusinessId,
      content: result.text || result.response,
      message: result.text || result.response,
      type: 'outgoing',
      senderType: 'chatbot',
      sender: resolvedBusinessId,
      senderModel: 'Business',
      receiver: customer._id,
      receiverModel: 'Customer',
      conversationId: conversation._id,
      campaignId: customer.lastCampaignId || null,
      status: 'sent'
    });

    return result;
  }
}

export default new WebhookService();
