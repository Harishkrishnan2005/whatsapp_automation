import api from '../utils/api';

const withDateRange = (dateRangeParams = {}) => ({
  params: {
    ...dateRangeParams,
  },
});

const analyticsService = {
  getAdvancedAnalytics: async (dateRangeParams) => {
    const response = await api.get('/analytics/advanced', withDateRange(dateRangeParams));
    return response.data;
  },
  getCampaignPerformance: async (dateRangeParams) => {
    const response = await api.get('/analytics/campaigns/performance', withDateRange(dateRangeParams));
    return Array.isArray(response.data) ? response.data : [];
  },
  getCustomerEngagement: async (dateRangeParams) => {
    const response = await api.get('/analytics/customers/engagement', withDateRange(dateRangeParams));
    return Array.isArray(response.data) ? response.data : [];
  },
  getDashboardBundle: async (dateRangeParams) => {
    const [analytics, campaigns, engagement] = await Promise.all([
      analyticsService.getAdvancedAnalytics(dateRangeParams),
      analyticsService.getCampaignPerformance(dateRangeParams),
      analyticsService.getCustomerEngagement(dateRangeParams),
    ]);

    return {
      analytics,
      campaigns,
      engagement,
    };
  },
};

export default analyticsService;
