import Appointment from '../models/Appointment.js';
import Notification from '../models/Notification.js';
import CustomerStatusService from './customerStatusService.js';
import buildTenantScope from '../utils/tenantScope.js';

class AppointmentService {
  // Create appointment
  async createAppointment(customerId, date, timeSlot, assignedTo = null, businessId) {
    const appointment = await Appointment.create({ customerId, date, timeSlot, assignedTo, businessId });
    await CustomerStatusService.syncStatusForCustomer(customerId);
    return appointment;
  }

  // Get all appointments (admin) or assigned appointments (staff)
  async getAppointments(user, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const scopeBusinessId = user.role === 'admin' ? undefined : user.businessId;
    let query = { ...buildTenantScope(scopeBusinessId) };

    if (user.role === 'staff') {
      query.assignedTo = user.id;
    }

    const appointments = await Appointment.find(query)
      .populate('customerId', 'name phone')
      .populate('assignedTo', 'name')
      .skip(skip)
      .limit(limit)
      .sort({ date: 1 });
    const total = await Appointment.countDocuments(query);
    return { appointments, total, page, limit };
  }

  // Get customer appointments
  async getCustomerAppointments(customerId) {
    return await Appointment.find({ customerId }).populate('customerId', 'name phone');
  }

  // Update appointment status
  async updateAppointmentStatus(appointmentId, status, user) {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Staff can only update their assigned appointments
    if (user.role === 'staff' && appointment.assignedTo.toString() !== user.id) {
      throw new Error('Unauthorized to update this appointment');
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status },
      { new: true }
    ).populate('customerId', 'name phone').populate('assignedTo', 'name');

    // Notify customer
    await Notification.create({
      userId: updatedAppointment.customerId._id,
      type: 'appointment_update',
      message: `Your appointment status: ${status}`,
      relatedId: appointmentId,
    });

    return updatedAppointment;
  }

  // Assign appointment to staff
  async assignAppointment(appointmentId, assignedTo) {
    return await Appointment.findByIdAndUpdate(
      appointmentId,
      { assignedTo },
      { new: true }
    ).populate('customerId', 'name phone').populate('assignedTo', 'name');
  }

  // Approve appointment
  async approveAppointment(appointmentId) {
    return await this.updateAppointmentStatus(appointmentId, 'approved');
  }

  // Reject appointment
  async rejectAppointment(appointmentId) {
    return await this.updateAppointmentStatus(appointmentId, 'rejected');
  }

  // Get available time slots (simplified)
  getAvailableSlots(date) {
    return [
      '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'
    ];
  }
}

export default new AppointmentService();
