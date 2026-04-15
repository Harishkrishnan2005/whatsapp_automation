import { useState, useEffect } from 'react';
import api from '../../utils/api';

const StaffBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [page, setPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    fetchBookings();
  }, [page]);

  const fetchBookings = async () => {
    try {
      const response = await api.get(`/appointments?page=${page}&limit=10`);
      setBookings(response.data.appointments);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/appointments/${id}/status`, { status });
      fetchBookings();
    } catch (error) {
      console.error('Error updating booking:', error);
    }
  };

  const openNotes = async (booking) => {
    setSelectedBooking(booking);
    setNewNote('');
    try {
      const customerId = booking?.customerId?._id;
      if (!customerId) {
        setNotes([]);
        return;
      }
      const response = await api.get(`/notes/${customerId}`);
      setNotes(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading notes:', error);
      setNotes([]);
    }
  };

  const addNote = async () => {
    if (!selectedBooking?.customerId?._id || !newNote.trim()) return;
    try {
      await api.post('/notes', {
        customerId: selectedBooking.customerId._id,
        content: newNote.trim(),
      });
      setNewNote('');
      openNotes(selectedBooking);
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 md:p-8 text-white">
      <div className="mb-8 rounded-2xl backdrop-blur-md border border-white/10 shadow-xl bg-slate-950/30 p-6">
        <h1 className="text-4xl font-bold text-white">My Bookings</h1>
        <p className="text-cyan-200 mt-2">Manage and track your appointment bookings.</p>
      </div>

      <div className="rounded-2xl backdrop-blur-md border border-white/10 shadow-xl bg-slate-950/30 overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-white/10 bg-slate-950/20 backdrop-blur-sm">
            <tr>
              <th className="p-4 text-left text-cyan-200 font-semibold">Customer</th>
              <th className="p-4 text-left text-cyan-200 font-semibold">Date & Time Slot</th>
              <th className="p-4 text-left text-cyan-200 font-semibold">Status</th>
              <th className="p-4 text-left text-cyan-200 font-semibold">Actions</th>
              <th className="p-4 text-left text-cyan-200 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking._id} className="border-b border-white/10 hover:bg-blue-500/10 backdrop-blur-sm transition-colors">
                <td className="p-4 text-white">
                  {booking.customerId?.name} ({booking.customerId?.phone})
                </td>
                <td className="p-4 text-slate-300">
                  {new Date(booking.date).toLocaleDateString()} - {booking.timeSlot}
                </td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    booking.status === 'Confirmed'
                      ? 'bg-green-500/10 backdrop-blur-sm border border-green-500/20 text-green-100'
                      : booking.status === 'Cancelled'
                      ? 'bg-red-500/10 backdrop-blur-sm border border-red-500/20 text-red-100'
                      : 'bg-amber-500/10 backdrop-blur-sm border border-amber-400/30 text-amber-100'
                  }`}>
                    {booking.status}
                  </span>
                </td>
                <td className="p-4">
                  {booking.status === 'Pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(booking._id, 'Confirmed')}
                        className="bg-green-500/80 hover:bg-green-600/80 backdrop-blur-sm border border-green-400/50 text-white px-3 py-1 rounded-lg text-sm font-medium transition-all"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => updateStatus(booking._id, 'Cancelled')}
                        className="bg-red-500/80 hover:bg-red-600/80 backdrop-blur-sm border border-red-400/50 text-white px-3 py-1 rounded-lg text-sm font-medium transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <button
                    onClick={() => openNotes(booking)}
                    className="rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3 py-1 text-sm font-medium text-cyan-100"
                  >
                    View/Add
                  </button>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">No bookings found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
          className="px-4 py-2 text-sm bg-slate-900/40 backdrop-blur-sm border border-white/10 text-white rounded-xl disabled:opacity-50 transition-all"
        >
          Previous
        </button>
        <button
          onClick={() => setPage(page + 1)}
          className="px-4 py-2 text-sm bg-blue-500/80 hover:bg-blue-600/80 backdrop-blur-sm border border-blue-400/50 text-white rounded-xl transition-all"
        >
          Next
        </button>
      </div>

      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950/95 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">
                Notes - {selectedBooking.customerId?.name || selectedBooking.customerId?.phone}
              </h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-sm text-white"
              >
                Close
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
                placeholder="Write notes about this client..."
                className="w-full resize-none rounded-lg border border-white/10 bg-slate-900/40 p-3 text-white outline-none"
              />
              <div className="mt-3 flex justify-end">
                <button
                  onClick={addNote}
                  disabled={!newNote.trim()}
                  className="rounded-lg border border-green-400/40 bg-green-500/20 px-3 py-1 text-sm font-semibold text-green-100 disabled:opacity-50"
                >
                  Add Note
                </button>
              </div>
            </div>

            <div className="max-h-64 space-y-2 overflow-y-auto">
              {notes.map((note) => (
                <div key={note._id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-300">
                    {new Date(note.createdAt).toLocaleString()} - {note.createdBy?.name || 'Staff'}
                  </p>
                  <p className="mt-1 text-sm text-white">{note.content}</p>
                </div>
              ))}
              {notes.length === 0 && (
                <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-400">
                  No notes available.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffBookings;
