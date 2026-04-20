import usageService from '../services/usageService.js';

class UsageController {
  async getUsage(req, res) {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        return res.status(400).json({ message: 'Business context missing' });
      }

      const usage = await usageService.getUsage(businessId);
      res.json(usage);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new UsageController();
