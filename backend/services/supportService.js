import SupportTicket from '../models/SupportTicket.js';
import buildTenantScope from '../utils/tenantScope.js';

class SupportService {
  async getTickets(businessId, page = 1, limit = 10, filters = {}) {
    const skip = (page - 1) * limit;
    const query = { ...buildTenantScope(businessId) };

    if (filters.status) {
      query.status = filters.status;
    }

    const tickets = await SupportTicket.find(query)
      .populate('customerId', 'name phone')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await SupportTicket.countDocuments(query);
    return { tickets, total, page, limit };
  }

  async createTicket({ businessId, customerId, subject, message }) {
    return await SupportTicket.create({
      businessId,
      customerId,
      subject,
      message,
      status: 'OPEN'
    });
  }

  async updateTicketStatus(businessId, ticketId, status, assignedTo = null) {
    const update = { status };
    if (assignedTo) {
      update.assignedTo = assignedTo;
    }
    return await SupportTicket.findOneAndUpdate(
      { _id: ticketId, businessId },
      update,
      { new: true }
    );
  }

  async addReply(businessId, ticketId, { sender, message }) {
    return await SupportTicket.findOneAndUpdate(
      { _id: ticketId, businessId },
      { $push: { replies: { sender, message, timestamp: new Date() } } },
      { new: true }
    );
  }
}

export default new SupportService();
