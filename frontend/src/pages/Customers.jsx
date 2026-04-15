import { useEffect, useMemo, useState } from 'react';
import { FiX } from 'react-icons/fi';
import api from '../utils/api';

const badgeClass = {
  existing: 'bg-emerald-100 text-emerald-700',
  new: 'bg-blue-100 text-blue-700',
};

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const visibleCustomers = useMemo(() => customers, [customers]);

  const fetchCustomers = async () => {
    try {
      const response = await api.get(`/customers?page=${page}&limit=${limit}`);
      setCustomers(response.data.customers || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page]);

  const metrics = useMemo(() => {
    const totalCustomers = customers.length;
    const existingCustomers = customers.filter((c) => c.status === 'existing').length;
    const totalOrders = customers.reduce((sum, c) => sum + Number(c.totalOrders || 0), 0);
    const pendingPayments = customers.filter((c) => String(c.paymentStatus || '').toLowerCase().includes('pending')).length;

    return { totalCustomers, existingCustomers, totalOrders, pendingPayments };
  }, [customers]);

  const handleViewDetails = async (customer) => {
    setSelectedCustomer(customer);
    setShowDetails(true);
    try {
      const response = await api.get(`/notes/${customer._id}`);
      setNotes(response.data);
    } catch (error) {
      console.error('Error fetching notes:', error);
      setNotes([]);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedCustomer) return;
    try {
      await api.post('/notes', {
        customerId: selectedCustomer._id,
        content: newNote,
      });
      setNewNote('');
      const response = await api.get(`/notes/${selectedCustomer._id}`);
      setNotes(response.data);
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await api.delete(`/notes/${noteId}`);
      setNotes((prev) => prev.filter((note) => note._id !== noteId));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Customer Management</h1>
        <p className="text-white/60">View customer profile, order and payment snapshot in one place.</p>
        <div className="mt-4 text-sm text-white/50">Page {page} of {totalPages}</div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl backdrop-blur-md border border-blue-400/30 bg-blue-600/20 p-6">
          <p className="text-sm text-white/70">Customers (This Page)</p>
          <p className="text-3xl font-bold text-white mt-2">{metrics.totalCustomers}</p>
        </div>
        <div className="rounded-2xl backdrop-blur-md border border-emerald-400/30 bg-emerald-600/20 p-6">
          <p className="text-sm text-white/70">Existing Customers</p>
          <p className="text-3xl font-bold text-white mt-2">{metrics.existingCustomers}</p>
        </div>
        <div className="rounded-2xl backdrop-blur-md border border-indigo-400/30 bg-indigo-600/20 p-6">
          <p className="text-sm text-white/70">Total Orders (This Page)</p>
          <p className="text-3xl font-bold text-white mt-2">{metrics.totalOrders}</p>
        </div>
        <div className="rounded-2xl backdrop-blur-md border border-amber-400/30 bg-amber-600/20 p-6">
          <p className="text-sm text-white/70">Pending Payments</p>
          <p className="text-3xl font-bold text-white mt-2">{metrics.pendingPayments}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl backdrop-blur-md border border-white/20 shadow-xl">
        <table className="w-full min-w-[1050px] text-sm"  >
          <thead className="border-b border-white/10 bg-white/5">
            <tr>
              <th className="p-4 text-left text-white font-semibold">Name</th>
              <th className="p-4 text-left text-white font-semibold">Phone</th>
              <th className="p-4 text-left text-white font-semibold">Age</th>
              <th className="p-4 text-left text-white font-semibold">Address</th>
              <th className="p-4 text-left text-white font-semibold">UPI ID</th>
              <th className="p-4 text-left text-white font-semibold">Customer Type</th>
              <th className="p-4 text-left text-white font-semibold">Total Orders</th>
              <th className="p-4 text-left text-white font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleCustomers.map((customer) => (
              <tr key={customer._id} className="border-t border-white/10 hover:bg-white/5 transition-colors">
                <td className="p-4 font-medium text-white">{customer.name || '-'}</td>
                <td className="p-4 text-white/70">{customer.phone}</td>
                <td className="p-4 text-white/70">{customer.age || '-'}</td>
                <td className="p-4 text-white/70 max-w-[220px] truncate" title={customer.address || '-'}>{customer.address || '-'}</td>
                <td className="p-4 text-white/70">{customer.upiId || '-'}</td>
                <td className="p-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${customer.status === 'existing' ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-400/30' : 'bg-blue-600/30 text-blue-200 border border-blue-400/30'}`}>
                    {customer.status === 'existing' ? 'Existing' : 'New'}
                  </span>
                </td>
                <td className="p-4 font-semibold text-white">{customer.totalOrders || 0}</td>
                <td className="p-4">
                  <button
                    onClick={() => handleViewDetails(customer)}
                    className="rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/30 px-3 py-1.5 text-sm font-medium text-blue-200 transition-all"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
            {visibleCustomers.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-white/50">No customers found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page === 1}
          className="rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Previous
        </button>
        <button
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page >= totalPages}
          className="rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-400/30 px-4 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Next
        </button>
      </div>

      {showDetails && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl backdrop-blur-md border border-white/20 bg-slate-900/95 shadow-2xl p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Customer Details</h2>
              <button onClick={() => setShowDetails(false)} className="text-white/60 hover:text-white"><FiX className="h-6 w-6" /></button>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg border border-white/10 bg-white/5 p-6 sm:grid-cols-2">
              <div>
                <p className="text-white/60 text-sm">Name</p>
                <p className="text-white font-medium mt-1">{selectedCustomer.name || '-'}</p>
              </div>
              <div>
                <p className="text-white/60 text-sm">Phone</p>
                <p className="text-white font-medium mt-1">{selectedCustomer.phone}</p>
              </div>
              <div>
                <p className="text-white/60 text-sm">Age</p>
                <p className="text-white font-medium mt-1">{selectedCustomer.age || '-'}</p>
              </div>
              <div>
                <p className="text-white/60 text-sm">Address</p>
                <p className="text-white font-medium mt-1">{selectedCustomer.address || '-'}</p>
              </div>
              <div>
                <p className="text-white/60 text-sm">UPI ID</p>
                <p className="text-white font-medium mt-1">{selectedCustomer.upiId || '-'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-white/60 text-sm">Total Orders</p>
                <p className="text-white font-medium mt-1">{selectedCustomer.totalOrders || 0}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-4 font-semibold text-white">Notes</h3>
              <div className="mb-6">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a new note..."
                  className="mb-3 w-full rounded-lg bg-white/10 border border-white/20 p-3 text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
                  rows="3"
                />
                <button
                  onClick={handleAddNote}
                  className="rounded-lg bg-green-600/30 hover:bg-green-600/50 border border-green-400/30 px-4 py-2 text-white font-medium transition-all"
                >
                  Add Note
                </button>
              </div>

              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note._id} className="rounded-lg bg-white/5 border border-white/10 p-4">
                    <p className="mb-2 text-xs text-white/50">
                      {new Date(note.createdAt).toLocaleString()} - {note.createdBy?.name || 'Admin'}
                    </p>
                    <p className="text-white mb-2">{note.content}</p>
                    <button
                      onClick={() => handleDeleteNote(note._id)}
                      className="text-sm text-red-400 hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                ))}
                {notes.length === 0 && <p className="py-4 text-center text-white/50">No notes yet</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;

