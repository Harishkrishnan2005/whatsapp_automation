import Template from '../models/Template.js';
import logger from '../utils/logger.js';

/**
 * SEED DATA FOR TEMPLATES
 * Predefined templates that businesses can use to auto-create flows
 */

const SEED_TEMPLATES = [
  {
    name: 'booking',
    description: 'Complete booking flow for appointments and services',
    category: 'booking',
    minPlan: 'BASIC',
    flows: [
      // START - Greeting
      {
        trigger: 'hi,hello,start,book,appointment,schedule',
        reply: 'Welcome! 👋 How can I help you today?\n\n1️⃣ Book an appointment\n2️⃣ View my bookings\n3️⃣ Cancel appointment',
        step: 'start',
        nextStep: 'booking_menu',
        action: 'JUST_SEND_REPLY',
      },
      // BOOKING MENU
      {
        trigger: '1,book,appointment,schedule',
        reply: 'Great! Let me help you book an appointment.\n\nWhat is your name?',
        step: 'booking_menu',
        nextStep: 'booking_name',
        action: 'JUST_SEND_REPLY',
      },
      {
        trigger: '2,view,my bookings,bookings,appointments',
        reply: 'You can view your bookings by logging into our portal or calling us at +1-800-000-0000',
        step: 'booking_menu',
        nextStep: 'start',
        action: 'JUST_SEND_REPLY',
      },
      {
        trigger: '3,cancel,remove',
        reply: 'To cancel an appointment, please contact us at +1-800-000-0000',
        step: 'booking_menu',
        nextStep: 'start',
        action: 'JUST_SEND_REPLY',
      },
      // BOOKING NAME
      {
        trigger: '*',
        reply: 'Thanks {{name}}! What service would you like to book?',
        step: 'booking_name',
        nextStep: 'booking_service',
        action: 'SAVE_NAME',
      },
      // BOOKING SERVICE
      {
        trigger: '*',
        reply: 'Perfect! When would you like to book? (Please provide date as DD/MM/YYYY)',
        step: 'booking_service',
        nextStep: 'booking_date',
        action: 'SAVE_SERVICE',
      },
      // BOOKING DATE
      {
        trigger: '*',
        reply: 'Perfect! Your appointment is confirmed.\n\n📋 Details:\nName: {{name}}\nService: {{service}}\nDate: {{date}}\n\nThank you for booking with us!',
        step: 'booking_date',
        nextStep: 'start',
        action: 'BOOK_APPOINTMENT',
      },
      // FALLBACK
      {
        trigger: '*',
        reply: 'Sorry, I didn\'t understand that. Please try again or type "help".',
        step: '*',
        nextStep: '*',
        action: 'JUST_SEND_REPLY',
      },
    ],
  },

  {
    name: 'ecommerce',
    description: 'Complete e-commerce flow with product browsing and ordering',
    category: 'ecommerce',
    minPlan: 'BASIC',
    flows: [
      // START - Greeting
      {
        trigger: 'hi,hello,start,shop,products,browse',
        reply: 'Welcome to our store! 🛍️\n\n1️⃣ Browse products\n2️⃣ View cart\n3️⃣ Checkout',
        step: 'start',
        nextStep: 'ecommerce_menu',
        action: 'JUST_SEND_REPLY',
      },
      // ECOMMERCE MENU
      {
        trigger: '1,browse,products,shop',
        reply: 'Let me show you our products...',
        step: 'ecommerce_menu',
        nextStep: 'ecommerce_products',
        action: 'SHOW_PRODUCTS',
      },
      {
        trigger: '2,cart,view cart,my cart',
        reply: 'Here\'s your cart:',
        step: 'ecommerce_menu',
        nextStep: 'start',
        action: 'SHOW_CART',
      },
      {
        trigger: '3,checkout,pay,purchase,buy',
        reply: 'Proceeding to checkout...',
        step: 'ecommerce_menu',
        nextStep: 'ecommerce_checkout',
        action: 'SHOW_CHECKOUT',
      },
      // PRODUCTS
      {
        trigger: '*',
        reply: 'Which product would you like? (Enter product number or name)',
        step: 'ecommerce_products',
        nextStep: 'ecommerce_select_product',
        action: 'JUST_SEND_REPLY',
      },
      // SELECT PRODUCT
      {
        trigger: '*',
        reply: 'How many would you like?',
        step: 'ecommerce_select_product',
        nextStep: 'ecommerce_quantity',
        action: 'SELECT_PRODUCT',
      },
      // QUANTITY
      {
        trigger: '*',
        reply: 'Great! Product added to cart. What else would you like?',
        step: 'ecommerce_quantity',
        nextStep: 'ecommerce_menu',
        action: 'SAVE_QUANTITY',
      },
      // CHECKOUT
      {
        trigger: '*',
        reply: 'Your order total is ${total}. Proceed to payment?',
        step: 'ecommerce_checkout',
        nextStep: 'ecommerce_payment',
        action: 'CALCULATE_TOTAL',
      },
      // PAYMENT
      {
        trigger: 'yes,confirm,pay,proceed',
        reply: 'Processing your payment...',
        step: 'ecommerce_payment',
        nextStep: 'ecommerce_confirmation',
        action: 'PROCESS_PAYMENT',
      },
      {
        trigger: 'no,cancel,back',
        reply: 'Order cancelled. Return to menu?',
        step: 'ecommerce_payment',
        nextStep: 'start',
        action: 'CANCEL_ORDER',
      },
      // CONFIRMATION
      {
        trigger: '*',
        reply: 'Thank you for your purchase! Your order ID is {orderId}. You will receive a confirmation email shortly.',
        step: 'ecommerce_confirmation',
        nextStep: 'start',
        action: 'ORDER_CONFIRMATION',
      },
      // FALLBACK
      {
        trigger: '*',
        reply: 'Sorry, I didn\'t understand that. Please try again.',
        step: '*',
        nextStep: '*',
        action: 'JUST_SEND_REPLY',
      },
    ],
  },

  {
    name: 'support',
    description: 'Customer support and ticket creation flow',
    category: 'support',
    minPlan: 'PRO',
    flows: [
      // START
      {
        trigger: 'help,support,issue,problem,ticket',
        reply: 'We\'re here to help! 😊\n\n1️⃣ Report an issue\n2️⃣ Track ticket\n3️⃣ FAQ',
        step: 'start',
        nextStep: 'support_menu',
        action: 'JUST_SEND_REPLY',
      },
      // MENU
      {
        trigger: '1,issue,problem,report',
        reply: 'Please describe the issue you\'re facing:',
        step: 'support_menu',
        nextStep: 'support_issue',
        action: 'JUST_SEND_REPLY',
      },
      {
        trigger: '2,track,ticket',
        reply: 'Please provide your ticket ID:',
        step: 'support_menu',
        nextStep: 'support_track',
        action: 'JUST_SEND_REPLY',
      },
      {
        trigger: '3,faq,help',
        reply: 'Check our FAQ at: www.example.com/faq',
        step: 'support_menu',
        nextStep: 'start',
        action: 'JUST_SEND_REPLY',
      },
      // ISSUE
      {
        trigger: '*',
        reply: 'Got it! What\'s your email address?',
        step: 'support_issue',
        nextStep: 'support_email',
        action: 'SAVE_ISSUE',
      },
      // EMAIL
      {
        trigger: '*',
        reply: 'Thanks! Your support ticket has been created. Ticket ID: {ticketId}. We\'ll get back to you soon!',
        step: 'support_email',
        nextStep: 'start',
        action: 'CREATE_SUPPORT_TICKET',
      },
      // TRACK
      {
        trigger: '*',
        reply: 'Your ticket status: {ticketStatus}',
        step: 'support_track',
        nextStep: 'start',
        action: 'GET_TICKET_STATUS',
      },
    ],
  },

  {
    name: 'feedback',
    description: 'Customer feedback and review collection',
    category: 'feedback',
    minPlan: 'PRO',
    flows: [
      // START
      {
        trigger: 'feedback,review,rate,opinion',
        reply: 'We\'d love your feedback! 📝\n\nHow would you rate your experience?\n\n1️⃣ Excellent ⭐⭐⭐⭐⭐\n2️⃣ Good ⭐⭐⭐⭐\n3️⃣ Average ⭐⭐⭐\n4️⃣ Poor ⭐⭐',
        step: 'start',
        nextStep: 'feedback_rating',
        action: 'JUST_SEND_REPLY',
      },
      // RATING
      {
        trigger: '1,excellent,5,⭐⭐⭐⭐⭐',
        reply: 'Awesome! Would you mind sharing why it was excellent?',
        step: 'feedback_rating',
        nextStep: 'feedback_comment',
        action: 'SAVE_FEEDBACK_RATING',
      },
      {
        trigger: '2,good,4,⭐⭐⭐⭐',
        reply: 'Great! Any suggestions for improvement?',
        step: 'feedback_rating',
        nextStep: 'feedback_comment',
        action: 'SAVE_FEEDBACK_RATING',
      },
      {
        trigger: '3,average,3,⭐⭐⭐',
        reply: 'We\'re sorry to hear that. What could we improve?',
        step: 'feedback_rating',
        nextStep: 'feedback_comment',
        action: 'SAVE_FEEDBACK_RATING',
      },
      {
        trigger: '4,poor,2,⭐⭐',
        reply: 'We apologize for the experience. What went wrong?',
        step: 'feedback_rating',
        nextStep: 'feedback_comment',
        action: 'SAVE_FEEDBACK_RATING',
      },
      // COMMENT
      {
        trigger: '*',
        reply: 'Thank you so much for your valuable feedback! We appreciate it. 🙏',
        step: 'feedback_comment',
        nextStep: 'start',
        action: 'CREATE_FEEDBACK',
      },
    ],
  },

  {
    name: 'lead-capture',
    description: 'Simple lead capture form',
    category: 'booking',
    
    minPlan: 'ENTERPRISE',
    flows: [
      // START
      {
        trigger: 'hi,hello,interested,lead,form',
        reply: 'Great to meet you! 👋 Let\'s get your details so we can follow up.\n\nWhat\'s your name?',
        step: 'start',
        nextStep: 'lead_name',
        action: 'JUST_SEND_REPLY',
      },
      // NAME
      {
        trigger: '*',
        reply: 'Nice to meet you, {name}! What\'s your email?',
        step: 'lead_name',
        nextStep: 'lead_email',
        action: 'SAVE_LEAD_NAME',
      },
      // EMAIL
      {
        trigger: '*',
        reply: 'Great! And your phone number?',
        step: 'lead_email',
        nextStep: 'lead_phone',
        action: 'SAVE_LEAD_EMAIL',
      },
      // PHONE
      {
        trigger: '*',
        reply: 'Perfect! What\'s your budget range?',
        step: 'lead_phone',
        nextStep: 'lead_budget',
        action: 'SAVE_LEAD_PHONE',
      },
      // BUDGET
      {
        trigger: '*',
        reply: 'Excellent! We\'ve saved your information. Our team will contact you within 24 hours.',
        step: 'lead_budget',
        nextStep: 'start',
        action: 'CREATE_LEAD',
      },
    ],
  },
];

/**
 * Seed templates to the database
 */
async function seedTemplates(tenantId) {
  try {
    if (!tenantId) {
      logger.info('Skipping template seed because no tenantId was provided');
      return;
    }

    const existingTemplates = await Template.find({ tenantId }).select('name').lean();
    const existingTemplateNames = new Set(existingTemplates.map((template) => template.name));

    const templatesToCreate = SEED_TEMPLATES
      .filter((template) => !existingTemplateNames.has(template.name))
      .map((template) => ({
        ...template,
        tenantId,
        isActive: true,
      }));

    if (templatesToCreate.length === 0) {
      logger.info(`Templates already seeded for tenant ${tenantId} (${existingTemplates.length} templates found)`);
      return;
    }

    const created = await Template.insertMany(templatesToCreate);

    logger.info(`✅ Seeded ${created.length} templates successfully`);
  } catch (error) {
    logger.error('Error seeding templates:', error);
  }
}

export default seedTemplates;
