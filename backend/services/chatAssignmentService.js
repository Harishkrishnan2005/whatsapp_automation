import ChatAssignment from '../models/ChatAssignment.js';
import Notification from '../models/Notification.js';
import Customer from '../models/Customer.js';
import Conversation from '../models/Conversation.js';
import buildTenantScope from '../utils/tenantScope.js';

class ChatAssignmentService {
  // Assign chat to staff
  async assignChat(customerId, staffId, businessId) {
    const tenantScope = buildTenantScope(businessId);
    const customer = await Customer.findOneAndUpdate(
      { _id: customerId, ...tenantScope },
      { assignedTo: staffId },
      { new: true }
    ).select('phone');

    if (!customer) {
      throw new Error('Customer not found');
    }

    const existing = await ChatAssignment.findOne({
      customerId,
      ...tenantScope,
      status: { $ne: 'closed' },
    });

    await Conversation.findOneAndUpdate(
      { phone: String(customer.phone || '').trim(), ...tenantScope },
      {
        $setOnInsert: {
          phone: String(customer.phone || '').trim(),
          businessId,
          customerId,
        },
        $set: {
          customerId,
          assignedStaffId: staffId,
          status: 'active',
          updatedAt: new Date(),
        }
      },
      { upsert: true, new: true }
    );

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
    const chats = await Conversation.find({ assignedStaffId: staffId, status: { $ne: 'closed' }, ...tenantScope })
      .populate('customerId', 'name phone')
      .populate('assignedStaffId', 'name email')
      .skip(skip)
      .limit(limit)
      .sort({ updatedAt: -1 })
      .lean();
    const total = await Conversation.countDocuments({ assignedStaffId: staffId, status: { $ne: 'closed' }, ...tenantScope });
    return { chats, total, page, limit };
  }

  // Get all active chats (admin view)
  async getAllActiveChats(page = 1, limit = 10, businessId) {
    const skip = (page - 1) * limit;
    const tenantScope = buildTenantScope(businessId);
    const chats = await Conversation.find({ status: { $ne: 'closed' }, ...tenantScope })
      .populate('customerId', 'name phone')
      .populate('assignedStaffId', 'name email')
      .skip(skip)
      .limit(limit)
      .sort({ updatedAt: -1 })
      .lean();
    const total = await Conversation.countDocuments({ status: { $ne: 'closed' }, ...tenantScope });
    return { chats, total, page, limit };
  }

  // Transfer chat to different staff
  async transferChat(assignmentId, newStaffId, businessId) {
    const updatedAssignment = await ChatAssignment.findOneAndUpdate(
      { _id: assignmentId, ...buildTenantScope(businessId) },
      { assignedTo: newStaffId },
      { new: true }
    ).populate('customerId', 'name phone');

    if (updatedAssignment?.customerId?.phone) {
      await Conversation.findOneAndUpdate(
        {
          phone: String(updatedAssignment.customerId.phone || '').trim(),
          ...buildTenantScope(businessId),
        },
        {
          $set: {
            customerId: updatedAssignment.customerId._id,
            assignedStaffId: newStaffId,
            status: 'active',
            updatedAt: new Date(),
          }
        }
      );
    }

    return updatedAssignment;
  }

  // Close chat
  async closeChat(assignmentId, notes = '', businessId, user = null) {
    const assignment = await ChatAssignment.findOne({ _id: assignmentId, ...buildTenantScope(businessId) });
    if (!assignment) {
      throw new Error('Chat assignment not found');
    }

    const userId = user?.id || user?._id;
    if (user?.role === 'staff' && String(assignment.assignedTo || '') !== String(userId || '')) {
      throw new Error('Unauthorized to close this conversation');
    }

    assignment.status = 'closed';
    assignment.notes = notes;
    await assignment.save();

    if (assignment) {
      const customer = await Customer.findOne({ _id: assignment.customerId, ...buildTenantScope(businessId) }).select('phone');
      if (customer?.phone) {
        await Conversation.findOneAndUpdate(
          { phone: String(customer.phone || '').trim(), ...buildTenantScope(businessId) },
          { $set: { status: 'closed', updatedAt: new Date() } }
        );
      }
    }

    return assignment;
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
