import ChatbotEngine from './chatbotEngine.js';

class ChatbotService {
  async processMessage(customer, message, businessId) {
    const resolvedBusinessId = businessId || customer?.businessId;
    const phone = String(customer?.phone || '').trim();

    console.log('[ChatbotService] Delegating to ChatbotEngine:', {
      phone,
      message,
      businessId: resolvedBusinessId ? String(resolvedBusinessId) : null,
    });

    return await ChatbotEngine.chatbotEngine({
      phone,
      message,
      businessId: resolvedBusinessId,
    });
  }
}

export default new ChatbotService();
