import FeedbackService from '../services/feedbackService.js';

class FeedbackController {
  async getFeedback(req, res) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const result = await FeedbackService.getFeedback(req.businessId, page, limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async createFeedback(req, res) {
    try {
      const { customerId, rating, comment } = req.body;
      const feedback = await FeedbackService.createFeedback({
        businessId: req.businessId,
        customerId,
        rating,
        comment
      });
      res.status(201).json(feedback);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
}

export default new FeedbackController();
