import ChatbotEngine from './chatbotEngine.js';

class ChatbotManagementService {
  async processMessageWithFlow({ phone, message, businessId }) {
    console.log('[ChatbotManagementService] Delegating to ChatbotEngine:', {
      phone,
      message,
      businessId: businessId ? String(businessId) : null,
    });

    return await ChatbotEngine.chatbotEngine({
      phone,
      message,
      businessId,
    });
  }
}

export default new ChatbotManagementService();
