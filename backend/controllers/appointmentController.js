import AppointmentService from '../services/appointmentService.js';

class AppointmentController {
  async createAppointment(req, res) {
    try {
      const { customerId, date, timeSlot, time, assignedTo, service } = req.body;
      const appointment = await AppointmentService.createAppointment(
        customerId,
        date,
        timeSlot || time,
        assignedTo,
        req.businessId,
        service,
        req.user?.id
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
      const result = await AppointmentService.getAppointments(req.user, req.businessId, page, limit, filters);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getAppointmentById(req, res) {
    try {
      const { id } = req.params;
      const appointment = await AppointmentService.getAppointmentById(id, req.businessId, req.user);
      if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
      res.json(appointment);
    } catch (error) {
      const status = error.message.includes('Unauthorized') ? 403 : 500;
      res.status(status).json({ message: error.message });
    }
  }

  async getCustomerAppointments(req, res) {
    try {
      const { customerId } = req.params;
      const appointments = await AppointmentService.getCustomerAppointments(customerId, req.businessId, req.user);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updateAppointmentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, date, time } = req.body;
      const appointment = await AppointmentService.updateAppointmentStatus(id, status, req.user, req.businessId, { date, time });
      res.json(appointment);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async assignAppointment(req, res) {
    try {
      const { id } = req.params;
      const { assignedTo } = req.body;
      const appointment = await AppointmentService.assignAppointment(id, assignedTo, req.user, req.businessId);
      res.json(appointment);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async addNote(req, res) {
    try {
      const { id } = req.params;
      const { text } = req.body;
      const appointment = await AppointmentService.addNote(id, text, req.user, req.businessId);
      res.json(appointment);
    } catch (error) {
      const status = error.message.includes('Unauthorized') ? 403 : 500;
      res.status(status).json({ message: error.message });
    }
  }
}

export default new AppointmentController();
