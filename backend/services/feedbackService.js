import Feedback from '../models/Feedback.js';
import buildTenantScope from '../utils/tenantScope.js';

class FeedbackService {
  async getFeedback(businessId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const query = { ...buildTenantScope(businessId) };

    const feedbacks = await Feedback.find(query)
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Feedback.countDocuments(query);
    return { feedbacks, total, page, limit };
  }

  async createFeedback({ businessId, customerId, rating, comment }) {
    return await Feedback.create({
      businessId,
      customerId,
      rating,
      comment,
      source: 'CHATBOT'
    });
  }
}

export default new FeedbackService();
