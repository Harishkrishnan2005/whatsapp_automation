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
