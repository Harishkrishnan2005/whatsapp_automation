import AppointmentService from '../services/appointmentService.js';

class AppointmentController {
  async createAppointment(req, res) {
    try {
      const { customerId, date, timeSlot, assignedTo } = req.body;
      const appointment = await AppointmentService.createAppointment(
        customerId,
        date,
        timeSlot,
        assignedTo,
        req.user.businessId
      );
      res.status(201).json(appointment);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getAppointments(req, res) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const filters = {
        from: req.query.from || '',
        to: req.query.to || '',
        search: req.query.search || '',
      };
      const result = await AppointmentService.getAppointments(req.user, page, limit, filters);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getCustomerAppointments(req, res) {
    try {
      const { customerId } = req.params;
      const appointments = await AppointmentService.getCustomerAppointments(customerId);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updateAppointmentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const appointment = await AppointmentService.updateAppointmentStatus(id, status, req.user);
      res.json(appointment);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async assignAppointment(req, res) {
    try {
      const { id } = req.params;
      const { assignedTo } = req.body;
      const appointment = await AppointmentService.assignAppointment(id, assignedTo);
      res.json(appointment);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new AppointmentController();
