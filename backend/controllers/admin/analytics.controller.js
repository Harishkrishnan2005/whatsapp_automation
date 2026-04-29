import AnalyticsService from '../../services/analyticsService.js';

const AdminAnalyticsController = {
  async getOverview(req, res) {
    try {
      const analytics = await AnalyticsService.getDashboardAnalytics(req.businessId);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async getConversion(req, res) {
    try {
      const analytics = await AnalyticsService.getDashboardAnalytics(req.businessId);
      res.json({
        category: analytics.category,
        summary: analytics.summary || {},
        funnel: analytics.funnel || [],
        customers: analytics.customers || {},
        orders: analytics.orders || {},
        appointments: analytics.appointments || {},
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async getRevenue(req, res) {
    try {
      const [dashboardAnalytics, advancedAnalytics] = await Promise.all([
        AnalyticsService.getDashboardAnalytics(req.businessId),
        AnalyticsService.getAdvancedAnalytics(req.businessId),
      ]);

      res.json({
        revenue: dashboardAnalytics.revenue || advancedAnalytics.revenue || {},
        reports: dashboardAnalytics.reports || {},
        orders: dashboardAnalytics.orders || {},
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async getChat(req, res) {
    try {
      const analytics = await AnalyticsService.getDashboardAnalytics(req.businessId);
      res.json({
        category: analytics.category,
        messages: analytics.messages || {},
        engagementTrend: analytics.engagementTrend || [],
        staffChat: analytics.staffChat || {},
        recentOrders: analytics.recentOrders || [],
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};

export default AdminAnalyticsController;

