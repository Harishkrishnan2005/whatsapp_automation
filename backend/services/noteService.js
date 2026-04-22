import Note from '../models/Note.js';
import buildTenantScope from '../utils/tenantScope.js';

class NoteService {
  async createNote(customerId, content, createdBy, businessId, appointmentId = null) {
    const note = new Note({
      customerId,
      appointmentId,
      content,
      createdBy,
      businessId,
    });
    return await note.save();
  }

  async getNotesByAppointment(appointmentId, businessId) {
    return await Note.find({ appointmentId, ...buildTenantScope(businessId) })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
  }

  async getNotesByCustomer(customerId, businessId) {
    return await Note.find({ customerId, ...buildTenantScope(businessId) })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
  }

  async deleteNote(id, businessId) {
    return await Note.findOneAndDelete({ _id: id, ...buildTenantScope(businessId) });
  }
}

export default new NoteService();
