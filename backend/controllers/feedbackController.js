import FeedbackService from '../services/feedbackService.js';

class FeedbackController {
  async getFeedback(req, res) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const result = await FeedbackService.getFeedback(req.businessId, page, limit, {
        assignedTo: req.user?.role === 'staff' ? req.user.id : undefined,
      });
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

  async assignFeedback(req, res) {
    try {
      const feedback = await FeedbackService.assignFeedback({
        businessId: req.businessId,
        feedbackId: req.params.id,
        staffId: req.body.assignedTo,
      });
      res.json(feedback);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async respond(req, res) {
    try {
      const feedback = await FeedbackService.respondToFeedback({
        businessId: req.businessId,
        feedbackId: req.params.id,
        userId: req.user.id,
        message: req.body.message,
      });
      res.json(feedback);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
}

export default new FeedbackController();
