/**
 * PLAN CONFIGURATION
 * Defines features, limits, and UI capabilities for each subscription tier
 * DO NOT expose flow count directly in UI - use feature-based rendering
 */

export const PLAN_CONFIG = {
  FREE: {
    name: 'Free',
    mode: 'starter',
    description: 'Perfect for getting started',
    price: 0,
    billing: 'free',
    maxFlows: 1,
    maxMessages: 100,
    maxUsers: 2,
    maxCustomers: 100,
    maxProducts: 10,
    maxOrders: 50,
    maxAppointments: 50,
    // Features - these determine UI visibility and capabilities
    features: {
      chatbot: { enabled: true, type: 'basic' }, // Single pre-configured bot
      templates: { enabled: false }, // Can't use templates
      customization: { enabled: false }, // Can't customize flows
      booking: { enabled: false },
      ecommerce: { enabled: false },
      support: { enabled: false },
      feedback: { enabled: false },
      campaigns: { enabled: false },
      automation: { enabled: false },
      advancedAnalytics: { enabled: false },
      multiUser: { enabled: false },
      apiAccess: { enabled: false },
      webhooks: { enabled: false },
    },
    // What templates are available (if any)
    availableTemplates: [],
    // UI Behavior
    ui: {
      showFlowBuilder: false,
      showTemplates: false,
      showCustomization: false,
      showMultiUser: false,
      hideFlowCount: true,
      message: 'Start with a ready chatbot'
    }
  },
  BASIC: {
    name: 'Basic',
    mode: 'template',
    description: 'Grow your business with templates',
    price: 999,
    billing: 'monthly',
    maxFlows: 5,
    maxMessages: 1000,
    maxUsers: 5,
    maxCustomers: 1000,
    maxProducts: 50,
    maxOrders: 500,
    maxAppointments: 500,
    features: {
      chatbot: { enabled: true, type: 'template' },
      templates: { enabled: true }, // Can select templates
      customization: { enabled: false }, // Limited customization
      booking: { enabled: true },
      ecommerce: { enabled: true },
      support: { enabled: false },
      feedback: { enabled: false },
      campaigns: { enabled: false },
      automation: { enabled: true },
      advancedAnalytics: { enabled: false },
      multiUser: { enabled: true },
      apiAccess: { enabled: false },
      webhooks: { enabled: false },
    },
    // Available templates for auto-flow creation
    availableTemplates: ['booking', 'ecommerce'],
    ui: {
      showFlowBuilder: false,
      showTemplates: true,
      showCustomization: false,
      showMultiUser: true,
      hideFlowCount: true,
      message: 'Select a template to get started'
    }
  },
  PRO: {
    name: 'Pro',
    mode: 'smart',
    description: 'Advanced features with conditional logic',
    price: 2499,
    billing: 'monthly',
    maxFlows: 15,
    maxMessages: 10000,
    maxUsers: 20,
    maxCustomers: 10000,
    maxProducts: 500,
    maxOrders: 5000,
    maxAppointments: 5000,
    features: {
      chatbot: { enabled: true, type: 'smart' },
      templates: { enabled: true },
      customization: { enabled: true }, // Can customize with conditional logic
      booking: { enabled: true },
      ecommerce: { enabled: true },
      support: { enabled: true },
      feedback: { enabled: true },
      campaigns: { enabled: true },
      automation: { enabled: true },
      advancedAnalytics: { enabled: true },
      multiUser: { enabled: true },
      apiAccess: { enabled: true },
      webhooks: { enabled: false },
    },
    availableTemplates: ['booking', 'ecommerce', 'support', 'feedback'],
    ui: {
      showFlowBuilder: true,
      showTemplates: true,
      showCustomization: true,
      showMultiUser: true,
      hideFlowCount: false,
      message: 'Build custom flows with conditional logic'
    }
  },
  ENTERPRISE: {
    name: 'Enterprise',
    mode: 'advanced',
    description: 'Unlimited power and flexibility',
    price: 4999,
    billing: 'monthly',
    maxFlows: Infinity,
    maxMessages: Infinity,
    maxUsers: Infinity,
    maxCustomers: Infinity,
    maxProducts: Infinity,
    maxOrders: Infinity,
    maxAppointments: Infinity,
    features: {
      chatbot: { enabled: true, type: 'advanced' },
      templates: { enabled: true },
      customization: { enabled: true },
      booking: { enabled: true },
      ecommerce: { enabled: true },
      support: { enabled: true },
      feedback: { enabled: true },
      campaigns: { enabled: true },
      automation: { enabled: true },
      advancedAnalytics: { enabled: true },
      multiUser: { enabled: true },
      apiAccess: { enabled: true },
      webhooks: { enabled: true },
    },
    availableTemplates: ['booking', 'ecommerce', 'support', 'feedback', 'lead-capture'],
    ui: {
      showFlowBuilder: true,
      showTemplates: true,
      showCustomization: true,
      showMultiUser: true,
      hideFlowCount: false,
      message: 'Full control over all features'
    }
  }
};

export const resolvePlanName = (planName = 'FREE') => {
  const normalizedPlan = String(planName || 'FREE').trim().toUpperCase();
  return PLAN_CONFIG[normalizedPlan] ? normalizedPlan : 'FREE';
};

export const resolveBusinessPlan = (business) => {
  if (!business) return 'FREE';
  return resolvePlanName(business.plan || business.subscription?.plan || 'FREE');
};

export const getPlanConfig = (planName = 'FREE') => {
  return PLAN_CONFIG[resolvePlanName(planName)];
};

export const getBusinessPlanConfig = (business) => {
  return getPlanConfig(resolveBusinessPlan(business));
};

/**
 * Feature-based UI helper
 * Use this on frontend to determine what to show based on user's plan
 */
export const getFeatureAccess = (planName, featureName) => {
  const plan = PLAN_CONFIG[planName];
  if (!plan) return false;
  const feature = plan.features[featureName];
  return feature?.enabled || false;
};

/**
 * Get max limit for a given resource and plan
 */
export const getMaxLimit = (planName, resourceType) => {
  const plan = PLAN_CONFIG[planName];
  if (!plan) return 0;
  const key = `max${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}`;
  return plan[key] || 0;
};
