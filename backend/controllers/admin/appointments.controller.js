import AppointmentController from '../appointmentController.js';
import Appointment from '../../models/Appointment.js';
import buildTenantScope from '../../utils/tenantScope.js';

const AdminAppointmentsController = {
  list(req, res) {
    return AppointmentController.getAppointments(req, res);
  },
  create(req, res) {
    return AppointmentController.createAppointment(req, res);
  },
  getById(req, res) {
    return AppointmentController.getAppointmentById(req, res);
  },
  async getNotes(req, res) {
    try {
      const { id } = req.params;
      const appointment = await Appointment.findOne({ _id: id, ...buildTenantScope(req.businessId) });
      if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
      res.json({ notes: appointment.notes || [] });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  addNote(req, res) {
    return AppointmentController.addNote(req, res);
  },
  assign(req, res) {
    return AppointmentController.assignAppointment(req, res);
  },
  async getAudit(req, res) {
    try {
      const { id } = req.params;
      const appointment = await Appointment.findOne({ _id: id, ...buildTenantScope(req.businessId) });
      if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
      res.json({ audit: appointment.statusHistory || [] });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};

export default AdminAppointmentsController;
