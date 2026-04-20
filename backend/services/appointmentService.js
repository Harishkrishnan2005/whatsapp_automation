import Appointment from '../models/Appointment.js';
import Notification from '../models/Notification.js';
import CustomerStatusService from './customerStatusService.js';
import buildTenantScope from '../utils/tenantScope.js';
import { buildCreatedAtFilter, buildSearchRegex } from '../utils/queryFilters.js';

class AppointmentService {
  // Create appointment
  async createAppointment(customerId, date, time, assignedTo = null, businessId, service = 'General') {
    const appointment = await Appointment.create({ customerId, date, time, assignedTo, businessId, service });
    await CustomerStatusService.syncStatusForCustomer(customerId, businessId);
    return appointment;
  }

  // Get all appointments (admin) or assigned appointments (staff)
  async getAppointments(user, businessId, page = 1, limit = 10, filters = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 10));
    const skip = (safePage - 1) * safeLimit;
    let query = { ...buildTenantScope(businessId) };
    const dateFilter = buildCreatedAtFilter(filters);
    const searchRegex = buildSearchRegex(filters.search);

    if (dateFilter) {
      query.date = dateFilter;
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
          searchRegex.test(String(apt?.time || '')) ||
          searchRegex.test(String(apt?.status || ''))
      );

      total = appointments.length;
      appointments = appointments.slice(skip, skip + safeLimit);
    }

    return { appointments, total, page: safePage, limit: safeLimit };
  }

  // Get customer appointments
  async getCustomerAppointments(customerId, businessId) {
    return await Appointment.find({ customerId, ...buildTenantScope(businessId) }).populate('customerId', 'name phone');
  }

  // Update appointment status
  async updateAppointmentStatus(appointmentId, status, user, businessId) {
    const tenantScope = buildTenantScope(businessId);
    const appointment = await Appointment.findOne({ _id: appointmentId, ...tenantScope });
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Staff can only update their assigned appointments
    if (user.role === 'staff' && String(appointment.assignedTo) !== String(user.id)) {
      throw new Error('Unauthorized to update this appointment');
    }

    const updatedAppointment = await Appointment.findOneAndUpdate(
      { _id: appointmentId, ...tenantScope },
      { status },
      { new: true }
    ).populate('customerId', 'name phone').populate('assignedTo', 'name');

    // Notify customer
    await Notification.create({
      userId: updatedAppointment.customerId._id,
      type: 'appointment_update',
      message: `Your appointment status: ${status}`,
      relatedId: appointmentId,
      businessId,
    });

    return updatedAppointment;
  }

  // Assign appointment to staff
  async assignAppointment(appointmentId, assignedTo, businessId) {
    return await Appointment.findOneAndUpdate(
      { _id: appointmentId, ...buildTenantScope(businessId) },
      { assignedTo },
      { new: true }
    ).populate('customerId', 'name phone').populate('assignedTo', 'name');
  }

  // Approve appointment
  async approveAppointment(appointmentId) {
    return await this.updateAppointmentStatus(appointmentId, 'BOOKED');
  }

  // Reject appointment
  async rejectAppointment(appointmentId) {
    return await this.updateAppointmentStatus(appointmentId, 'CANCELLED');
  }

  // Get available time slots (simplified)
  getAvailableSlots(date) {
    return [
      '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'
    ];
  }
}

export default new AppointmentService();
