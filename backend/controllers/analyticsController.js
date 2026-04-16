import AnalyticsService from '../services/analyticsService.js';

class AnalyticsController {
  async getAnalytics(req, res) {
    try {
      const analytics = await AnalyticsService.getAnalytics(req.businessId);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getAdvancedAnalytics(req, res) {
    try {
      const analytics = await AnalyticsService.getAdvancedAnalytics(req.businessId);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getDashboardAnalytics(req, res) {
    try {
      const analytics = await AnalyticsService.getDashboardAnalytics(req.businessId);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getCampaignPerformance(req, res) {
    try {
      const performance = await AnalyticsService.getCampaignPerformance(req.businessId);
      res.json(performance);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getCustomerEngagement(req, res) {
    try {
      const engagement = await AnalyticsService.getCustomerEngagement(req.businessId);
      res.json(engagement);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new AnalyticsController();
