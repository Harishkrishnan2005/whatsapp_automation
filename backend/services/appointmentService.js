import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import Notification from '../models/Notification.js';
import CustomerStatusService from './customerStatusService.js';
import buildTenantScope from '../utils/tenantScope.js';
import { buildCreatedAtFilter, buildSearchRegex } from '../utils/queryFilters.js';

class AppointmentService {
  ensureAppointmentAccess(appointment, user) {
    const userId = user?.id || user?._id;

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Staff can access appointments assigned to them
    if (user?.role === 'staff') {
      // Handle both populated objects and plain IDs
      const assignedToId = appointment.assignedTo?._id || appointment.assignedTo;
      const appointmentAssignedId = String(assignedToId || '');
      const currentUserId = String(userId || '');
      
      // If appointment has no assignedTo or doesn't match staff user, deny access
      if (!appointmentAssignedId || appointmentAssignedId !== currentUserId) {
        throw new Error('Unauthorized to access this appointment');
      }
    }
  }

  normalizeLegacyNotes(notes, fallbackDate = new Date()) {
    if (Array.isArray(notes)) {
      return notes;
    }

    const legacyText = typeof notes === 'string' ? notes.trim() : '';
    if (!legacyText) {
      return [];
    }

    return [{
      text: legacyText,
      createdBy: null,
      createdAt: fallbackDate,
    }];
  }

  async normalizeLegacyAppointmentNotes(appointmentId, businessId, notes, fallbackDate) {
    const normalizedNotes = this.normalizeLegacyNotes(notes, fallbackDate);

    await Appointment.findOneAndUpdate(
      { _id: appointmentId, ...buildTenantScope(businessId) },
      { $set: { notes: normalizedNotes } },
      { new: false }
    );

    return normalizedNotes;
  }

  normalizeAppointmentForResponse(appointment) {
    if (!appointment) {
      return appointment;
    }

    const fallbackDate = appointment.updatedAt || appointment.createdAt || new Date();
    appointment.notes = this.normalizeLegacyNotes(appointment.notes, fallbackDate);
    appointment.auditLogs = Array.isArray(appointment.auditLogs) ? appointment.auditLogs : [];
    return appointment;
  }

  // Create appointment
  async createAppointment(customerId, date, time, assignedTo = null, businessId, service = 'General', userId = null) {
    const appointment = await Appointment.create({ 
      customerId, 
      date, 
      time, 
      assignedTo, 
      businessId, 
      tenantId: businessId, // Ensure multi-tenant isolation
      service,
      auditLogs: [{
        type: 'CREATED',
        performedBy: userId || assignedTo || customerId, // Fallback to customerId if created by bot
        metadata: { date, time, service }
      }]
    });
    await CustomerStatusService.syncStatusForCustomer(customerId, businessId);
    return appointment;
  }

  // Get all appointments
  async getAppointments(user, businessId, page = 1, limit = 10, filters = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 10));
    const skip = (safePage - 1) * safeLimit;
    const userId = user?.id || user?._id;
    
    let query = { ...buildTenantScope(businessId) };
    const dateFilter = buildCreatedAtFilter(filters);
    const searchRegex = buildSearchRegex(filters.search);

    if (dateFilter) {
      query.date = dateFilter;
    }

    if (user?.role === 'staff' && userId) {
      query.assignedTo = userId;
    }

    let appointmentQuery = Appointment.find(query)
      .populate('customerId', 'name phone')
      .populate('assignedTo', 'name')
      .sort({ date: 1 });

    if (!searchRegex) {
      appointmentQuery = appointmentQuery.skip(skip).limit(safeLimit);
    }

    let appointments = await appointmentQuery.lean();
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

  // Get appointment by ID
  async getAppointmentById(appointmentId, businessId, user = null) {
    const appointment = await Appointment.findOne({ _id: appointmentId, ...buildTenantScope(businessId) })
      .populate('customerId', 'name phone')
      .populate('assignedTo', 'name')
      .populate('notes.createdBy', 'name')
      .populate('auditLogs.performedBy', 'name');

    this.ensureAppointmentAccess(appointment, user);
    return this.normalizeAppointmentForResponse(appointment);
  }

  // Update appointment status
  async updateAppointmentStatus(appointmentId, status, user, businessId, metadata = {}) {
    const userId = user?.id || user?._id;
    if (!userId) throw new Error('User context missing');

    const tenantScope = buildTenantScope(businessId);
    const appointment = await Appointment.findOne({ _id: appointmentId, ...tenantScope });
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Staff can only update their assigned appointments
    if (user.role === 'staff' && String(appointment.assignedTo) !== String(userId)) {
      throw new Error('Unauthorized to update this appointment');
    }

    const updateData = { status };
    if (metadata.date) updateData.date = metadata.date;
    if (metadata.time) updateData.time = metadata.time;

    const auditType = status === 'RESCHEDULED' ? 'RESCHEDULED' : 'STATUS_CHANGED';

    const updatedAppointment = await Appointment.findOneAndUpdate(
      { _id: appointmentId, ...tenantScope },
      { 
        ...updateData,
        $push: {
          auditLogs: {
            type: auditType,
            performedBy: userId,
            metadata: { oldStatus: appointment.status, newStatus: status, ...metadata }
          }
        }
      },
      { new: true, runValidators: true }
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
  async assignAppointment(appointmentId, assignedTo, user, businessId) {
    const userId = user?.id || user?._id;
    if (!userId) throw new Error('User context missing');

    return await Appointment.findOneAndUpdate(
      { _id: appointmentId, ...buildTenantScope(businessId) },
      { 
        assignedTo,
        $push: {
          auditLogs: {
            type: 'STAFF_ASSIGNED',
            performedBy: userId,
            metadata: { assignedTo }
          }
        }
      },
      { new: true, runValidators: true }
    ).populate('customerId', 'name phone').populate('assignedTo', 'name');
  }

  // Add note to appointment
  async addNote(appointmentId, text, user, businessId) {
    if (!text || String(text).trim() === '') throw new Error('Note text is required');
    if (!user) throw new Error('User context missing');

    const userId = user.id || user._id;
    if (!userId) throw new Error('User ID missing from context');

    const tenantScope = buildTenantScope(businessId);
    
    // 1. Verify appointment exists and belongs to this business
    const existingApt = await Appointment.findOne({ _id: appointmentId, ...tenantScope });
    this.ensureAppointmentAccess(existingApt, user);

    if (!Array.isArray(existingApt.notes)) {
      await this.normalizeLegacyAppointmentNotes(
        appointmentId,
        businessId,
        existingApt.notes,
        existingApt.updatedAt || existingApt.createdAt || new Date()
      );
    }

    // 2. Perform the update using tenant scope
    const updatedAppointment = await Appointment.findOneAndUpdate(
      { _id: appointmentId, ...tenantScope },
      { 
        $push: {
          notes: { 
            text: String(text).trim(), 
            createdBy: userId 
          },
          auditLogs: {
            type: 'NOTE_ADDED',
            performedBy: userId,
            metadata: { notePreview: String(text).substring(0, 50) }
          }
        }
      },
      { new: true, runValidators: true }
    ).populate('notes.createdBy', 'name');

    return this.normalizeAppointmentForResponse(updatedAppointment);
  }

  // Get customer appointments
  async getCustomerAppointments(customerId, businessId, user = null) {
    const query = { customerId, ...buildTenantScope(businessId) };
    const userId = user?.id || user?._id;

    if (user?.role === 'staff') {
      query.assignedTo = userId;
    }

    return await Appointment.find(query)
      .populate('customerId', 'name phone')
      .populate('assignedTo', 'name')
      .sort({ date: -1 });
  }
}

export default new AppointmentService();
