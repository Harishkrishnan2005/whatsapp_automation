import ChatbotFlow from '../models/ChatbotFlow.js';

class ChatbotSeederService {
  async seedBookingFlows(businessId) {
    const flows = [
      {
        businessId,
        category: 'booking',
        trigger: 'hi',
        reply: 'Welcome to our booking service. How can I help you?',
        step: 'start',
        nextStep: 'options',
        action: 'NONE',
        isActive: true,
      },
      {
        businessId,
        category: 'booking',
        trigger: 'book',
        reply: 'Please provide your name for the booking.',
        step: 'options',
        nextStep: 'ask_name',
        action: 'NONE',
        isActive: true,
      },
      {
        businessId,
        category: 'booking',
        trigger: '*',
        reply: 'Thanks {{name}}. When would you like to book the appointment?',
        step: 'ask_name',
        nextStep: 'ask_date',
        action: 'SAVE_NAME',
        isActive: true,
      },
      {
        businessId,
        category: 'booking',
        trigger: '*',
        reply: 'Processing your appointment request...',
        step: 'ask_date',
        nextStep: 'confirmed',
        action: 'BOOK_APPOINTMENT',
        isActive: true,
      },
    ];

    await ChatbotFlow.insertMany(flows);
    console.log(`[SEEDER] Seeded booking flows for business: ${businessId}`);
  }

  async seedEcommerceFlows(businessId) {
    const flows = [
      {
        businessId,
        category: 'ecommerce',
        trigger: 'hi',
        reply: 'Welcome to our store! Would you like to see our products?',
        step: 'start',
        nextStep: 'options',
        action: 'NONE',
        isActive: true,
      },
      {
        businessId,
        category: 'ecommerce',
        trigger: 'products',
        reply: 'Here are our latest products.',
        step: 'options',
        nextStep: 'show_products',
        action: 'SHOW_PRODUCTS',
        isActive: true,
      },
      {
        businessId,
        category: 'ecommerce',
        trigger: '*',
        reply: 'Please provide your name to start your order.',
        step: 'show_products',
        nextStep: 'ask_name',
        action: 'SAVE_PRODUCT',
        isActive: true,
      },
      {
        businessId,
        category: 'ecommerce',
        trigger: '*',
        reply: 'Where should we deliver your order, {{name}}?',
        step: 'ask_name',
        nextStep: 'ask_address',
        action: 'SAVE_NAME',
        isActive: true,
      },
    ];

    await ChatbotFlow.insertMany(flows);
    console.log(`[SEEDER] Seeded ecommerce flows for business: ${businessId}`);
  }
}

export default new ChatbotSeederService();
