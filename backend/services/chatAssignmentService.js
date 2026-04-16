import ChatAssignment from '../models/ChatAssignment.js';
import Notification from '../models/Notification.js';
import Customer from '../models/Customer.js';
import buildTenantScope from '../utils/tenantScope.js';

class ChatAssignmentService {
  // Assign chat to staff
  async assignChat(customerId, staffId, businessId) {
    const tenantScope = buildTenantScope(businessId);
    const existing = await ChatAssignment.findOne({
      customerId,
      ...tenantScope,
      status: { $ne: 'closed' },
    });

    await Customer.findOneAndUpdate({ _id: customerId, ...tenantScope }, { assignedTo: staffId });

    if (existing) {
      existing.assignedTo = staffId;
      existing.status = 'assigned';
      existing.businessId = existing.businessId || businessId;
      await existing.save();
      await Notification.create({
        userId: staffId,
        type: 'assignment',
        message: `Chat reassigned to you for customer ${customerId}`,
        relatedId: customerId,
        businessId,
      });
      return existing;
    }

    const assignment = await ChatAssignment.create({
      customerId,
      assignedTo: staffId,
      businessId,
    });

    // Notify staff
    await Notification.create({
      userId: staffId,
      type: 'assignment',
      message: `Chat assigned to you for customer ${customerId}`,
      relatedId: customerId,
      businessId,
    });

    return assignment;
  }

  // Get assigned chats for staff
  async getAssignedChats(staffId, page = 1, limit = 10, businessId) {
    const skip = (page - 1) * limit;
    const tenantScope = buildTenantScope(businessId);
    const chats = await ChatAssignment.find({ assignedTo: staffId, ...tenantScope })
      .populate('customerId', 'name phone')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    const total = await ChatAssignment.countDocuments({ assignedTo: staffId, ...tenantScope });
    return { chats, total, page, limit };
  }

  // Get all active chats (admin view)
  async getAllActiveChats(page = 1, limit = 10, businessId) {
    const skip = (page - 1) * limit;
    const tenantScope = buildTenantScope(businessId);
    const chats = await ChatAssignment.find({ status: { $ne: 'closed' }, ...tenantScope })
      .populate('customerId', 'name phone')
      .populate('assignedTo', 'name email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    const total = await ChatAssignment.countDocuments({ status: { $ne: 'closed' }, ...tenantScope });
    return { chats, total, page, limit };
  }

  // Transfer chat to different staff
  async transferChat(assignmentId, newStaffId, businessId) {
    return await ChatAssignment.findOneAndUpdate(
      { _id: assignmentId, ...buildTenantScope(businessId) },
      { assignedTo: newStaffId },
      { new: true }
    ).populate('customerId', 'name phone');
  }

  // Close chat
  async closeChat(assignmentId, notes = '', businessId) {
    return await ChatAssignment.findOneAndUpdate(
      { _id: assignmentId, ...buildTenantScope(businessId) },
      { status: 'closed', notes },
      { new: true }
    );
  }

  // Admin take over chat
  async takeOverChat(assignmentId, adminId, businessId) {
    return await ChatAssignment.findOneAndUpdate(
      { _id: assignmentId, ...buildTenantScope(businessId) },
      { assignedTo: adminId, status: 'in_progress' },
      { new: true }
    );
  }

  // Get chat history for customer
  async getChatHistory(customerId, businessId) {
    return await ChatAssignment.find({ customerId, ...buildTenantScope(businessId) })
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });
  }
}

export default new ChatAssignmentService();
