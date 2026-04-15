import NoteService from '../services/noteService.js';

class NoteController {
  async createNote(req, res) {
    try {
      const { customerId, content } = req.body;
      const createdBy = req.user.id;
      const businessId = req.user?.role === 'admin' ? undefined : req.user.businessId;
      const note = await NoteService.createNote(customerId, content, createdBy, businessId || req.user.businessId);
      res.status(201).json(note);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getNotesByCustomer(req, res) {
    try {
      const { customerId } = req.params;
      const scopeBusinessId = req.user?.role === 'admin' ? undefined : req.user.businessId;
      const notes = await NoteService.getNotesByCustomer(customerId, scopeBusinessId);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async deleteNote(req, res) {
    try {
      const { id } = req.params;
      await NoteService.deleteNote(id);
      res.json({ message: 'Note deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new NoteController();
