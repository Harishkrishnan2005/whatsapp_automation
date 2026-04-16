import Appointment from '../models/Appointment.js';
import Notification from '../models/Notification.js';
import CustomerStatusService from './customerStatusService.js';
import buildTenantScope from '../utils/tenantScope.js';
import { buildCreatedAtFilter, buildSearchRegex } from '../utils/queryFilters.js';

class AppointmentService {
  // Create appointment
  async createAppointment(customerId, date, timeSlot, assignedTo = null, businessId) {
    const appointment = await Appointment.create({ customerId, date, timeSlot, assignedTo, businessId });
    await CustomerStatusService.syncStatusForCustomer(customerId);
    return appointment;
  }

  // Get all appointments (admin) or assigned appointments (staff)
  async getAppointments(user, page = 1, limit = 10, filters = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 10));
    const skip = (safePage - 1) * safeLimit;
    const scopeBusinessId = user.role === 'admin' ? undefined : user.businessId;
    let query = { ...buildTenantScope(scopeBusinessId) };
    const createdAt = buildCreatedAtFilter(filters);
    const searchRegex = buildSearchRegex(filters.search);

    if (createdAt) {
      query.createdAt = createdAt;
    }

    if (user.role === 'staff') {
      query.assignedTo = user.id;
    }

    let appointmentQuery = Appointment.find(query)
      .populate('customerId', 'name phone')
      .populate('assignedTo', 'name')
      .sort({ date: 1 });

    if (!searchRegex) {
      appointmentQuery = appointmentQuery.skip(skip).limit(safeLimit);
    }

    let appointments = await appointmentQuery;
    let total = await Appointment.countDocuments(query);

    if (searchRegex) {
      appointments = appointments.filter(
        (apt) =>
          searchRegex.test(String(apt?.customerId?.name || '')) ||
          searchRegex.test(String(apt?.customerId?.phone || '')) ||
          searchRegex.test(String(apt?.timeSlot || '')) ||
          searchRegex.test(String(apt?.status || ''))
      );

      total = appointments.length;
      appointments = appointments.slice(skip, skip + safeLimit);
    }

    return { appointments, total, page: safePage, limit: safeLimit };
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
