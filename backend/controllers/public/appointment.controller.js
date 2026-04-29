import AppointmentController from '../appointmentController.js';

const PublicAppointmentController = {
  book(req, res) {
    return AppointmentController.createAppointment(req, res);
  },
  confirm(req, res) {
    return AppointmentController.updateAppointmentStatus(req, res);
  }
};

export default PublicAppointmentController;
