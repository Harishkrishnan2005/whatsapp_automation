/**
 * PLAN CONFIGURATION
 * Defines feature limits and capabilities for each subscription tier
 */

export const PLAN_CONFIG = {
  FREE: {
    maxFlows: 1,
    monthlyMessages: 100,
    staffLimit: 2,
    allowedStaffRoles: [],
    templates: false,
    customTemplates: false,
    campaigns: false,
    price: 0
  },
  BASIC: {
    maxFlows: 5,
    monthlyMessages: 1000,
    staffLimit: 5,
    allowedStaffRoles: ['SUPPORT', 'SALES'],
    templates: "DEFAULT",
    customTemplates: false,
    campaigns: false,
    price: 999
  },
  PRO: {
    maxFlows: 15,
    monthlyMessages: 10000,
    staffLimit: 20,
    allowedStaffRoles: ['SUPPORT', 'SALES', 'MARKETING', 'MANAGER'],
    templates: "CUSTOM",
    customTemplates: true,
    campaigns: true,
    price: 2499
  },
  ENTERPRISE: {
    maxFlows: Infinity,
    monthlyMessages: Infinity,
    staffLimit: Infinity,
    allowedStaffRoles: ['SUPPORT', 'SALES', 'MARKETING', 'MANAGER'],
    templates: "UNLIMITED",
    customTemplates: true,
    campaigns: true,
    price: 4999
  }
};

export const STAFF_ROLE_MIN_PLAN = {
  SUPPORT: 'BASIC',
  SALES: 'BASIC',
  MARKETING: 'PRO',
  MANAGER: 'PRO',
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

export const getAllowedStaffRolesForPlan = (planName = 'FREE') => {
  return getPlanConfig(planName)?.allowedStaffRoles || [];
};

export const isStaffRoleAllowedInPlan = (planName = 'FREE', staffRole = '') => {
  const normalizedRole = String(staffRole || '').trim().toUpperCase();
  return getAllowedStaffRolesForPlan(planName).includes(normalizedRole);
};

export const getRequiredPlanForStaffRole = (staffRole = '') => {
  const normalizedRole = String(staffRole || '').trim().toUpperCase();
  return STAFF_ROLE_MIN_PLAN[normalizedRole] || 'ENTERPRISE';
};
