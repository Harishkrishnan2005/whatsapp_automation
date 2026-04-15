import QuickReply from '../models/QuickReply.js';

class QuickReplyService {
  // Create quick reply
  async createQuickReply(title, message, createdBy) {
    return await QuickReply.create({ title, message, createdBy });
  }

  // Get all quick replies
  async getQuickReplies() {
    return await QuickReply.find().populate('createdBy', 'name email');
  }

  // Update quick reply
  async updateQuickReply(replyId, data) {
    return await QuickReply.findByIdAndUpdate(replyId, data, { new: true });
  }

  // Delete quick reply
  async deleteQuickReply(replyId) {
    return await QuickReply.findByIdAndDelete(replyId);
  }
}

export default new QuickReplyService();