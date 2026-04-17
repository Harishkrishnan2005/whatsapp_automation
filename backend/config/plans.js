export const PLAN_CONFIG = {
  FREE: {
    maxFlows: 1,
    maxMessages: 100,
    allowCampaigns: false,
    allowAutomation: false,
    price: 0
  },
  BASIC: {
    maxFlows: 5,
    maxMessages: 1000,
    allowCampaigns: false,
    allowAutomation: true,
    price: 999 // In INR for example
  },
  PRO: {
    maxFlows: 15,
    maxMessages: 10000,
    allowCampaigns: true,
    allowAutomation: true,
    price: 2499
  },
  ENTERPRISE: {
    maxFlows: Infinity,
    maxMessages: Infinity,
    allowCampaigns: true,
    allowAutomation: true,
    price: 4999
  }
};
