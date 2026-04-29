import AppointmentController from '../appointmentController.js';
import Appointment from '../../models/Appointment.js';
import buildTenantScope from '../../utils/tenantScope.js';

const StaffAppointmentsController = {
  list(req, res) {
    return AppointmentController.getAppointments(req, res);
  },
  getById(req, res) {
    return AppointmentController.getAppointmentById(req, res);
  },
  async getNotes(req, res) {
    try {
      const { id } = req.params;
      const appointment = await Appointment.findOne({ 
        _id: id, 
        ...buildTenantScope(req.businessId),
        assignedTo: req.user.id
      });
      if (!appointment) return res.status(404).json({ message: 'Appointment not found or not assigned to you' });
      res.json({ notes: appointment.notes || [] });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  addNote(req, res) {
    return AppointmentController.addNote(req, res);
  },
  updateStatus(req, res) {
    return AppointmentController.updateAppointmentStatus(req, res);
  }
};

export default StaffAppointmentsController;
