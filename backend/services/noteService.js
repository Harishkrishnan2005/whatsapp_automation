import Note from '../models/Note.js';
import buildTenantScope from '../utils/tenantScope.js';

class NoteService {
  async createNote(customerId, content, createdBy, businessId) {
    const note = new Note({
      customerId,
      content,
      createdBy,
      businessId,
    });
    return await note.save();
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
