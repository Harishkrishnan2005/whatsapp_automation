import SupportTicket from '../models/SupportTicket.js';
import buildTenantScope from '../utils/tenantScope.js';

class SupportTicketController {
  async getTickets(req, res) {
    try {
      const query = { ...buildTenantScope(req.businessId) };
      if (req.user?.role === 'staff') {
        query.assignedTo = req.user.id;
      }

      const tickets = await SupportTicket.find(query)
        .populate('customerId', 'name phone')
        .populate('assignedTo', 'name email staffRole status')
        .sort({ createdAt: -1 });
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getTicketById(req, res) {
    try {
      const query = { _id: req.params.id, ...buildTenantScope(req.businessId) };
      if (req.user?.role === 'staff') {
        query.assignedTo = req.user.id;
      }

      const ticket = await SupportTicket.findOne(query)
        .populate('customerId', 'name phone')
        .populate('assignedTo', 'name email staffRole status');
      if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
      res.json(ticket);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async createTicket(req, res) {
    try {
      const { customerId, subject, message, assignedTo } = req.body;
      const ticket = await SupportTicket.create({
        businessId: req.businessId,
        tenantId: req.businessId,
        customerId,
        subject,
        message,
        assignedTo: assignedTo || (req.user.role === 'staff' ? req.user.id : null),
      });

      const populated = await SupportTicket.findById(ticket._id)
        .populate('customerId', 'name phone')
        .populate('assignedTo', 'name email staffRole status');
      res.status(201).json(populated);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async replyToTicket(req, res) {
    try {
      const { message } = req.body;
      const query = { _id: req.params.id, ...buildTenantScope(req.businessId) };
      if (req.user?.role === 'staff') {
        query.assignedTo = req.user.id;
      }

      const ticket = await SupportTicket.findOne(query);
      
      if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

      ticket.replies.push({
        sender: req.user.role === 'staff' ? 'staff' : 'admin',
        message,
        timestamp: new Date()
      });
      
      ticket.status = 'IN_PROGRESS';
      await ticket.save();

      const populated = await SupportTicket.findById(ticket._id)
        .populate('customerId', 'name phone')
        .populate('assignedTo', 'name email staffRole status');
      res.json(populated);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updateStatus(req, res) {
    try {
      const { status } = req.body;
      const query = { _id: req.params.id, ...buildTenantScope(req.businessId) };
      if (req.user?.role === 'staff') {
        query.assignedTo = req.user.id;
      }

      const ticket = await SupportTicket.findOneAndUpdate(
        query,
        { status },
        { new: true }
      )
        .populate('customerId', 'name phone')
        .populate('assignedTo', 'name email staffRole status');
      
      if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
      res.json(ticket);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async assignTicket(req, res) {
    try {
      const ticket = await SupportTicket.findOneAndUpdate(
        { _id: req.params.id, ...buildTenantScope(req.businessId) },
        {
          assignedTo: req.body.assignedTo,
          status: 'IN_PROGRESS',
        },
        { new: true }
      )
        .populate('customerId', 'name phone')
        .populate('assignedTo', 'name email staffRole status');

      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }

      res.json(ticket);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new SupportTicketController();
