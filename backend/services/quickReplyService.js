import QuickReply from '../models/QuickReply.js';

class QuickReplyService {
  // Create quick reply
  async createQuickReply(businessId, title, message, createdBy) {
    return await QuickReply.create({ title, message, createdBy, businessId });
  }

  // Get all quick replies
  async getQuickReplies(businessId) {
    return await QuickReply.find({ businessId }).populate('createdBy', 'name email');
  }

  // Update quick reply
  async updateQuickReply(businessId, replyId, data) {
    return await QuickReply.findOneAndUpdate({ _id: replyId, businessId }, data, { new: true });
  }

  // Delete quick reply
  async deleteQuickReply(businessId, replyId) {
    return await QuickReply.findOneAndDelete({ _id: replyId, businessId });
  }
}

export default new QuickReplyService();
