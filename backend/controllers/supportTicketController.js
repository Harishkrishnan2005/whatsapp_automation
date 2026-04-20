import SupportTicket from '../models/SupportTicket.js';

class SupportTicketController {
  async getTickets(req, res) {
    try {
      const tickets = await SupportTicket.find({ businessId: req.businessId })
        .populate('customerId', 'name phone')
        .sort({ createdAt: -1 });
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getTicketById(req, res) {
    try {
      const ticket = await SupportTicket.findOne({ _id: req.params.id, businessId: req.businessId })
        .populate('customerId', 'name phone');
      if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
      res.json(ticket);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async replyToTicket(req, res) {
    try {
      const { message } = req.body;
      const ticket = await SupportTicket.findOne({ _id: req.params.id, businessId: req.businessId });
      
      if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

      ticket.replies.push({
        sender: 'admin',
        message,
        timestamp: new Date()
      });
      
      ticket.status = 'IN_PROGRESS';
      await ticket.save();
      
      res.json(ticket);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updateStatus(req, res) {
    try {
      const { status } = req.body;
      const ticket = await SupportTicket.findOneAndUpdate(
        { _id: req.params.id, businessId: req.businessId },
        { status },
        { new: true }
      );
      
      if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
      res.json(ticket);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new SupportTicketController();
