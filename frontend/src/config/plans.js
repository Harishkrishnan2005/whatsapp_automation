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

export const getAllowedStaffRolesForPlan = (planName = 'FREE') => {
  const normalizedPlan = String(planName || 'FREE').trim().toUpperCase();
  return PLAN_CONFIG[normalizedPlan]?.allowedStaffRoles || [];
};
