/**
 * PLAN CONFIGURATION
 * Defines feature limits and capabilities for each subscription tier
 */

export const PLAN_CONFIG = {
  FREE: {
    maxFlows: 1,
    monthlyMessages: 100,
    staffLimit: 2,
    templates: false,
    customTemplates: false,
    campaigns: false,
    price: 0
  },
  BASIC: {
    maxFlows: 5,
    monthlyMessages: 1000,
    staffLimit: 5,
    templates: "DEFAULT",
    customTemplates: false,
    campaigns: false,
    price: 999
  },
  PRO: {
    maxFlows: 15,
    monthlyMessages: 10000,
    staffLimit: 20,
    templates: "CUSTOM",
    customTemplates: true,
    campaigns: true,
    price: 2499
  },
  ENTERPRISE: {
    maxFlows: Infinity,
    monthlyMessages: Infinity,
    staffLimit: Infinity,
    templates: "UNLIMITED",
    customTemplates: true,
    campaigns: true,
    price: 4999
  }
};

export const getPlanPrice = (plan) => {
  return PLAN_CONFIG[plan]?.price || 0;
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
