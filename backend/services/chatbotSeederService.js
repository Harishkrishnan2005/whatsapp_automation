import ChatbotFlow from '../models/ChatbotFlow.js';

class ChatbotSeederService {
  getBookingFlows(businessId) {
    return [
      {
        businessId,
        category: 'booking',
        trigger: 'hi,hello,hey',
        reply: 'Welcome to our booking service. How can I help you?\n1. Book Appointment\n2. View My Bookings\n3. Support',
        step: 'start',
        nextStep: 'menu',
        action: 'NONE',
        isActive: true,
      },
      {
        businessId,
        category: 'booking',
        trigger: '1,book',
        reply: 'Please provide the service you want to book.',
        step: 'menu',
        nextStep: 'ask_service',
        action: 'NONE',
        isActive: true,
      },
      {
        businessId,
        category: 'booking',
        trigger: '2,view,bookings',
        reply: 'Fetching your bookings...',
        step: 'menu',
        nextStep: 'start',
        action: 'GET_BOOKINGS',
        isActive: true,
      },
      {
        businessId,
        category: 'booking',
        trigger: '3,support',
        reply: 'Connecting you to support...',
        step: 'menu',
        nextStep: 'start',
        action: 'START_SUPPORT',
        isActive: true,
      },
      {
        businessId,
        category: 'booking',
        trigger: '*',
        reply: 'Please provide your name for the booking.',
        step: 'ask_service',
        nextStep: 'ask_name',
        action: 'SAVE_SERVICE',
        isActive: true,
      },
      {
        businessId,
        category: 'booking',
        trigger: '*',
        reply: 'Thanks {{name}}. Which date would you like to book? (YYYY-MM-DD)',
        step: 'ask_name',
        nextStep: 'ask_date',
        action: 'SAVE_NAME',
        isActive: true,
      },
      {
        businessId,
        category: 'booking',
        trigger: '*',
        reply: 'What time would you like? (HH:mm)',
        step: 'ask_date',
        nextStep: 'ask_time',
        action: 'SAVE_DATE',
        isActive: true,
      },
      {
        businessId,
        category: 'booking',
        trigger: '*',
        reply: 'Processing your booking...',
        step: 'ask_time',
        nextStep: 'start',
        action: 'BOOK_APPOINTMENT',
        isActive: true,
      },
      {
        businessId,
        category: 'booking',
        trigger: 'fallback',
        reply: 'I could not match that input. Let us start again. Say hi to continue.',
        step: 'system',
        nextStep: 'start',
        action: 'NONE',
        isActive: true,
      },
    ];
  }

  getEcommerceFlows(businessId) {
    return [
      {
        businessId,
        category: 'ecommerce',
        trigger: 'hi,hello,hey',
        reply: 'Welcome to our store. How can I help you?\n1. Store Products\n2. Track Order\n3. My Orders\n4. Support',
        step: 'start',
        nextStep: 'menu',
        action: 'NONE',
        isActive: true,
      },
      {
        businessId,
        category: 'ecommerce',
        trigger: '1,products,store',
        reply: 'Here are our available products:',
        step: 'menu',
        nextStep: 'menu',
        action: 'SHOW_PRODUCTS',
        isActive: true,
      },
      {
        businessId,
        category: 'ecommerce',
        trigger: '2,track',
        reply: 'Please enter your Order ID to track.',
        step: 'menu',
        nextStep: 'track_order',
        action: 'NONE',
        isActive: true,
      },
      {
        businessId,
        category: 'ecommerce',
        trigger: '*',
        reply: 'Checking your order status...',
        step: 'track_order',
        nextStep: 'menu',
        action: 'TRACK_ORDER',
        isActive: true,
      },
      {
        businessId,
        category: 'ecommerce',
        trigger: '3,orders',
        reply: 'Fetching your recent orders...',
        step: 'menu',
        nextStep: 'menu',
        action: 'GET_ORDERS',
        isActive: true,
      },
      {
        businessId,
        category: 'ecommerce',
        trigger: '4,support',
        reply: 'Connecting you to support...',
        step: 'menu',
        nextStep: 'start',
        action: 'START_SUPPORT',
        isActive: true,
      },
      {
        businessId,
        category: 'ecommerce',
        trigger: 'fallback',
        reply: 'I could not match that input. Let us start again. Say hi to continue.',
        step: 'system',
        nextStep: 'start',
        action: 'NONE',
        isActive: true,
      },
    ];
  }

  getFlowsForCategory(businessId, category) {
    return category === 'booking'
      ? this.getBookingFlows(businessId)
      : this.getEcommerceFlows(businessId);
  }

  async upsertFlows(flows) {
    for (const flow of flows) {
      await ChatbotFlow.findOneAndUpdate(
        {
          businessId: flow.businessId,
          category: flow.category,
          step: flow.step,
          trigger: flow.trigger,
        },
        { $setOnInsert: flow },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    }
  }

  async ensureCoreFlowCoverage(businessId, category) {
    const flows = this.getFlowsForCategory(businessId, category);
    await this.upsertFlows(flows);
  }

  async seedBookingFlows(businessId) {
    await ChatbotFlow.deleteMany({ businessId, category: 'booking' });
    await ChatbotFlow.insertMany(this.getBookingFlows(businessId));
    console.log(`[SEEDER] Seeded booking flows for business: ${businessId}`);
  }

  async seedEcommerceFlows(businessId) {
    await ChatbotFlow.deleteMany({ businessId, category: 'ecommerce' });
    await ChatbotFlow.insertMany(this.getEcommerceFlows(businessId));
    console.log(`[SEEDER] Seeded ecommerce flows for business: ${businessId}`);
  }
}

export default new ChatbotSeederService();
