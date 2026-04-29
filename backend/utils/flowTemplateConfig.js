const TEXT_ONLY_STEPS = new Set([
  'ASK_NAME',
  'ASK_AGE',
  'ASK_ADDRESS',
  'ASK_QUANTITY',
  'MENU',
  'OPTIONS',
]);

const DEFAULT_TEMPLATE_CONFIGS = {
  GREETING: {
    responseType: 'TEMPLATE',
    templateName: 'GREETING',
    variableMapping: {
      name: 'customer.name',
    },
  },
  ORDER_CONFIRMATION: {
    responseType: 'TEMPLATE',
    templateName: 'ORDER_CONFIRMATION',
    variableMapping: {
      name: 'customer.name',
      orderId: 'context.orderId',
      details: 'context.orderSummary',
      business: 'business.name',
    },
  },
  PAYMENT_CONFIRMATION: {
    responseType: 'TEMPLATE',
    templateName: 'PAYMENT_CONFIRMATION',
    variableMapping: {
      name: 'customer.name',
      orderId: 'context.orderId',
    },
  },
  PAYMENT_LINK: {
    responseType: 'TEMPLATE',
    templateName: 'PAYMENT_LINK',
    variableMapping: {
      name: 'customer.name',
      amount: 'context.amount',
      limit: 'context.limit',
      link: 'context.paymentUrl',
    },
  },
  ORDER_STATUS: {
    responseType: 'TEMPLATE',
    templateName: 'ORDER_STATUS',
    variableMapping: {
      name: 'customer.name',
      orderId: 'context.orderId',
      status: 'context.status',
      details: 'context.details',
      business: 'business.name',
    },
  },
  CANCELLATION: {
    responseType: 'TEMPLATE',
    templateName: 'CANCELLATION',
    variableMapping: {
      name: 'customer.name',
      type: 'context.cancellationType',
    },
  },
  RETURN_REFUND: {
    responseType: 'TEMPLATE',
    templateName: 'RETURN_REFUND',
    variableMapping: {
      name: 'customer.name',
      orderId: 'context.orderId',
      status: 'context.returnStatus',
    },
  },
  SUPPORT_FOLLOWUP: {
    responseType: 'TEMPLATE',
    templateName: 'SUPPORT_FOLLOWUP',
    variableMapping: {
      name: 'customer.name',
    },
  },
  REMINDER: {
    responseType: 'TEMPLATE',
    templateName: 'REMINDER',
    variableMapping: {
      name: 'customer.name',
      type: 'context.reminderType',
      date: 'context.date',
    },
  },
};

function normalize(value) {
  return String(value || '').trim().toUpperCase();
}

function toTextConfig(flow = {}) {
  return {
    ...flow,
    responseType: 'TEXT',
    templateName: '',
    variableMapping: {},
  };
}

function pickTemplateConfig(templateKey) {
  const config = DEFAULT_TEMPLATE_CONFIGS[templateKey];
  return config
    ? {
        responseType: config.responseType,
        templateName: config.templateName,
        variableMapping: { ...config.variableMapping },
      }
    : null;
}

export function resolveFlowTemplateConfig(flow = {}) {
  const step = normalize(flow.step);
  const action = normalize(flow.action);
  const triggerValues = Array.isArray(flow.trigger)
    ? flow.trigger
    : Array.isArray(flow.triggerKeywords)
      ? flow.triggerKeywords
      : flow.trigger
        ? [flow.trigger]
        : [];
  const trigger = normalize(triggerValues[0]);

  if (TEXT_ONLY_STEPS.has(step)) {
    return toTextConfig(flow);
  }

  let templateKey = null;

  if (step === 'START') {
    templateKey = 'GREETING';
  } else if (
    ['CREATE_ORDER', 'ORDER_CONFIRMATION'].includes(action) ||
    ['ORDER_CONFIRM', 'ORDER_CONFIRMATION'].includes(step) ||
    ['ORDER_CREATED_COD'].includes(trigger)
  ) {
    templateKey = 'ORDER_CONFIRMATION';
  } else if (
    ['VERIFY_PAYMENT'].includes(action) ||
    ['PAYMENT_SUCCESS'].includes(step)
  ) {
    templateKey = 'PAYMENT_CONFIRMATION';
  } else if (
    ['PROCESS_PAYMENT'].includes(action) ||
    ['PAYMENT_LINK'].includes(step) ||
    ['ORDER_CREATED_ONLINE', 'PAYMENT_LINK_TEXT'].includes(trigger)
  ) {
    templateKey = 'PAYMENT_LINK';
  } else if (
    ['TRACK_ORDER'].includes(action) ||
    ['ORDER_STATUS'].includes(step) ||
    ['ORDER_STATUS_SUMMARY'].includes(trigger)
  ) {
    templateKey = 'ORDER_STATUS';
  } else if (
    ['CANCEL_ORDER'].includes(action) ||
    ['CANCEL_CONFIRM'].includes(step) ||
    ['ORDER_CANCEL_SUCCESS', 'ORDER_CANCELLED_STATUS'].includes(trigger)
  ) {
    templateKey = 'CANCELLATION';
  } else if (
    ['REQUEST_REFUND'].includes(action) ||
    ['RETURN_CONFIRM'].includes(step) ||
    ['ORDER_RETURN_REQUESTED'].includes(trigger)
  ) {
    templateKey = 'RETURN_REFUND';
  } else if (
    ['START_SUPPORT', 'CREATE_SUPPORT'].includes(action) ||
    ['SUPPORT_ACK'].includes(step) ||
    ['SUPPORT_FEEDBACK_THANKS'].includes(trigger)
  ) {
    templateKey = 'SUPPORT_FOLLOWUP';
  } else if (
    ['BOOK_APPOINTMENT'].includes(action) ||
    ['APPOINTMENT_REMINDER'].includes(step) ||
    ['APPOINTMENT_BOOKED_SUCCESS'].includes(trigger)
  ) {
    templateKey = 'REMINDER';
  }

  if (!templateKey) {
    return toTextConfig(flow);
  }

  return {
    ...flow,
    ...pickTemplateConfig(templateKey),
  };
}

export function isTextOnlyStep(step = '') {
  return TEXT_ONLY_STEPS.has(normalize(step));
}
