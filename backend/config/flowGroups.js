export const FLOW_GROUPS = {
  BASIC_DEMO: [
    {
      step: 'START',
      trigger: ['hi', 'hello', 'start'],
      reply: 'Welcome! What is your name?',
      nextStep: 'ASK_NAME',
      action: 'NONE',
      order: 1,
    },
    {
      step: 'ASK_NAME',
      trigger: ['*'],
      reply: 'Please enter your age.',
      nextStep: 'ASK_AGE',
      action: 'SAVE_NAME',
      order: 2,
    },
    {
      step: 'ASK_AGE',
      trigger: ['*'],
      reply: 'Thanks! Choose an option: 1. Products 2. Booking',
      nextStep: 'MENU',
      action: 'SAVE_AGE',
      order: 3,
    },
  ],

  ECOMMERCE_BASIC: [
    {
      step: 'MENU',
      trigger: ['1', 'products', 'menu'],
      reply: 'Here are our products.',
      action: 'SHOW_PRODUCTS',
      nextStep: 'ASK_PRODUCT_NAME',
      order: 4,
    },
    {
      step: 'ASK_PRODUCT_NAME',
      trigger: ['*'],
      reply: 'How many units do you want?',
      action: 'SELECT_PRODUCT',
      nextStep: 'ASK_QUANTITY',
      order: 5,
    },
    {
      step: 'ASK_QUANTITY',
      trigger: ['*'],
      reply: 'Type "confirm" to place your order.',
      action: 'SAVE_QUANTITY',
      nextStep: 'CONFIRM_PRODUCT',
      order: 6,
    },
    {
      step: 'CONFIRM_PRODUCT',
      trigger: ['confirm', 'yes', 'checkout', 'place order', 'order'],
      reply: 'Creating your order...',
      action: 'CREATE_ORDER',
      nextStep: 'ORDER_CONFIRM',
      order: 7,
    },
  ],

  BOOKING_BASIC: [
    {
      step: 'BOOK_START',
      trigger: ['2', 'booking', 'book'],
      reply: 'Let us start your booking. Which service do you need?',
      action: 'NONE',
      nextStep: 'SELECT_SERVICE',
      order: 6,
    },
    {
      step: 'SELECT_SERVICE',
      trigger: ['*'],
      reply: 'Thanks. Our team will confirm your booking shortly.',
      action: 'SHOW_SERVICES',
      nextStep: 'SELECT_SERVICE',
      order: 7,
    },
  ],
};

export const PLAN_FLOW_ACCESS = {
  FREE: ['BASIC_DEMO'],
  BASIC: ['BASIC_DEMO', 'ECOMMERCE_BASIC', 'BOOKING_BASIC'],
  PRO: ['BASIC_DEMO', 'ECOMMERCE_BASIC', 'BOOKING_BASIC'],
  ENTERPRISE: 'ALL',
};
