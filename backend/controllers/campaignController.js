import CampaignService from '../services/campaignService.js';

class CampaignController {
  async createCampaign(req, res) {
    try {
      const { message, audience, type, productIds, productOffers } = req.body;
      const campaign = await CampaignService.createCampaign(
        req.businessId,
        message,
        audience,
        type || 'TEXT',
        productIds || [],
        productOffers || []
      );
      res.status(201).json(campaign);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async createProductCampaign(req, res) {
    try {
      const { message, audience, productIds, productOffers } = req.body;
      if (!productIds || productIds.length === 0) {
        return res.status(400).json({ message: 'At least one product must be selected' });
      }
      const campaign = await CampaignService.createCampaign(
        req.businessId,
        message,
        audience,
        'PRODUCT',
        productIds,
        productOffers || []
      );
      res.status(201).json(campaign);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getCampaigns(req, res) {
    try {
      const filters = {
        from: req.query.from || '',
        to: req.query.to || '',
        search: req.query.search || '',
      };
      const campaigns = await CampaignService.getCampaigns(req.businessId, filters);
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getCampaignAnalytics(req, res) {
    try {
      const { id } = req.params;
      const analytics = await CampaignService.getCampaignAnalytics(req.businessId, id);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new CampaignController();
