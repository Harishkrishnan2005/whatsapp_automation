export const PLAN_CONFIG = {
  FREE: {
    maxFlows: 1,
    maxMessages: 100,
    maxUsers: 2,
    allowCampaigns: false,
    allowAutomation: true,
    allowAdvancedAnalytics: false,
    price: 0
  },
  BASIC: {
    maxFlows: 5,
    maxMessages: 1000,
    maxUsers: 5,
    allowCampaigns: false,
    allowAutomation: true,
    allowAdvancedAnalytics: false,
    price: 999
  },
  PRO: {
    maxFlows: 15,
    maxMessages: 10000,
    maxUsers: 20,
    allowCampaigns: true,
    allowAutomation: true,
    allowAdvancedAnalytics: true,
    price: 2499
  },
  ENTERPRISE: {
    maxFlows: Infinity,
    maxMessages: Infinity,
    maxUsers: Infinity,
    allowCampaigns: true,
    allowAutomation: true,
    allowAdvancedAnalytics: true,
    price: 4999
  }
};
