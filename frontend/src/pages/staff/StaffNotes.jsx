import { useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';

const StaffNotes = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAssignedCustomers = async () => {
    try {
      const [chatsRes, ordersRes, appointmentsRes] = await Promise.all([
        api.get('/staff/chats?page=1&limit=100'),
        api.get('/orders?page=1&limit=100'),
        api.get('/appointments?page=1&limit=100'),
      ]);

      const map = new Map();

      (chatsRes.data?.chats || []).forEach((chat) => {
        const customer = chat.customerId;
        if (customer?._id) map.set(String(customer._id), customer);
      });

      (ordersRes.data?.orders || []).forEach((order) => {
        const customer = order.customerId;
        if (customer?._id) map.set(String(customer._id), customer);
      });

      (appointmentsRes.data?.appointments || []).forEach((appointment) => {
        const customer = appointment.customerId;
        if (customer?._id) map.set(String(customer._id), customer);
      });

      const rows = Array.from(map.values());
      setCustomers(rows);
      if (!selectedCustomer && rows.length > 0) {
        setSelectedCustomer(rows[0]);
      }
    } catch (error) {
      console.error('Error fetching assigned customers:', error);
    }
  };

  const fetchNotes = async (customerId) => {
    if (!customerId) return;
    try {
      const response = await api.get(`/notes/${customerId}`);
      setNotes(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      setNotes([]);
    }
  };

  useEffect(() => {
    fetchAssignedCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer?._id) {
      fetchNotes(selectedCustomer._id);
    }
  }, [selectedCustomer?._id]);

  const addNote = async () => {
    if (!newNote.trim() || !selectedCustomer?._id) return;
    setSaving(true);
    try {
      await api.post('/notes', {
        customerId: selectedCustomer._id,
        content: newNote.trim(),
      });
      setNewNote('');
      fetchNotes(selectedCustomer._id);
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setSaving(false);
    }
  };

  const customerCount = useMemo(() => customers.length, [customers]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 md:p-8 text-white">
      <div className="mb-8 rounded-2xl border border-white/10 bg-slate-950/30 p-6 shadow-xl backdrop-blur-md">
        <h1 className="text-4xl font-bold text-white">Customer Notes</h1>
        <p className="mt-2 text-cyan-200">View assigned customers and add notes shared with admin.</p>
        <p className="mt-2 text-xs text-slate-300">Assigned customers: {customerCount}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 shadow-xl backdrop-blur-md">
          <h2 className="mb-3 text-lg font-semibold text-white">Customers</h2>
          <div className="space-y-2">
            {customers.map((customer) => (
              <button
                key={customer._id}
                onClick={() => setSelectedCustomer(customer)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                  selectedCustomer?._id === customer._id
                    ? 'border-cyan-300/40 bg-cyan-500/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <p className="font-semibold text-white">{customer.name || 'Unknown'}</p>
                <p className="text-xs text-cyan-200">{customer.phone || '-'}</p>
              </button>
            ))}
            {customers.length === 0 && (
              <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-400">
                No assigned customers yet.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 shadow-xl backdrop-blur-md lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold text-white">
            Notes {selectedCustomer ? `- ${selectedCustomer.name || selectedCustomer.phone}` : ''}
          </h2>

          <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
              placeholder="Write a note about this customer..."
              className="w-full resize-none rounded-lg border border-white/10 bg-slate-900/40 p-3 text-white outline-none"
            />
            <div className="mt-3 flex justify-end">
              <button
                onClick={addNote}
                disabled={!selectedCustomer || !newNote.trim() || saving}
                className="rounded-lg border border-blue-400/50 bg-blue-500/80 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Add Note'}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note._id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-300">
                  {new Date(note.createdAt).toLocaleString()} - {note.createdBy?.name || 'Staff'}
                </p>
                <p className="mt-2 text-sm text-white">{note.content}</p>
              </div>
            ))}
            {notes.length === 0 && (
              <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-400">
                No notes available for this customer.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffNotes;
