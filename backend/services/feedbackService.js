import Feedback from '../models/Feedback.js';
import buildTenantScope from '../utils/tenantScope.js';

class FeedbackService {
  async getFeedback(businessId, page = 1, limit = 10, options = {}) {
    const skip = (page - 1) * limit;
    const query = { ...buildTenantScope(businessId) };
    if (options.assignedTo) {
      query.assignedTo = options.assignedTo;
    }

    const feedbacks = await Feedback.find(query)
      .populate('customerId', 'name phone')
      .populate('assignedTo', 'name email staffRole status')
      .populate('response.respondedBy', 'name email')
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
      tenantId: businessId,
      customerId,
      rating,
      comment,
      source: 'CHATBOT'
    });
  }

  async assignFeedback({ businessId, feedbackId, staffId }) {
    const query = { _id: feedbackId, ...buildTenantScope(businessId) };
    const feedback = await Feedback.findOneAndUpdate(
      query,
      {
        assignedTo: staffId,
        status: 'IN_PROGRESS',
      },
      { new: true }
    )
      .populate('customerId', 'name phone')
      .populate('assignedTo', 'name email staffRole status')
      .populate('response.respondedBy', 'name email');

    if (!feedback) {
      throw new Error('Feedback not found');
    }

    return feedback;
  }

  async respondToFeedback({ businessId, feedbackId, userId, message }) {
    const feedback = await Feedback.findOneAndUpdate(
      { _id: feedbackId, ...buildTenantScope(businessId) },
      {
        status: 'RESPONDED',
        response: {
          message: String(message || '').trim(),
          respondedBy: userId,
          respondedAt: new Date(),
        },
      },
      { new: true }
    )
      .populate('customerId', 'name phone')
      .populate('assignedTo', 'name email staffRole status')
      .populate('response.respondedBy', 'name email');

    if (!feedback) {
      throw new Error('Feedback not found');
    }

    return feedback;
  }
}

export default new FeedbackService();
