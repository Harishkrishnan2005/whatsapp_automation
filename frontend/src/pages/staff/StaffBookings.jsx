import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCalendar, FiUser, FiCheckCircle, FiXCircle, FiPlus, FiClock, FiFileText } from 'react-icons/fi';
import api from '../../utils/api';
import useAnalyticsStore from '../../store/analyticsStore';
import { getDateRangePayload } from '../../utils/dateRange';
import Badge from '../../components/ui/Badge';

const StaffBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [page, setPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const dateRange = useAnalyticsStore((state) => state.dateRange);
  const searchQuery = useAnalyticsStore((state) => state.searchQuery);

  useEffect(() => {
    fetchBookings();

    // REAL-TIME SYNC: Synchronize with admin changes every 30s
    const interval = setInterval(fetchBookings, 30000);
    return () => clearInterval(interval);
  }, [page, dateRange, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [dateRange, searchQuery]);

  const fetchBookings = async () => {
    try {
      const { from, to } = getDateRangePayload(dateRange);
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
      });
      if (from) params.set('from', from);
      if (to) {
        if (dateRange?.preset === 'last_7_days' || !dateRange?.preset || dateRange?.preset === 'today') {
           const future = new Date();
           future.setFullYear(future.getFullYear() + 1);
           params.set('to', future.toISOString().split('T')[0]);
        } else {
           params.set('to', to);
        }
      }
      if (searchQuery) params.set('search', searchQuery);

      const response = await api.get(`/appointments?${params.toString()}`);
      setBookings(response.data.appointments || []);
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
    try {
      const response = await api.get(`/appointments/${booking._id}`);
      setSelectedBooking(response.data);
      setNotes(Array.isArray(response.data.notes) ? response.data.notes : []);
      setNewNote('');
    } catch (error) {
      console.error('Error loading notes:', error);
      setNotes([]);
    }
  };

  const addNote = async () => {
    if (!selectedBooking?._id || !newNote.trim()) return;
    try {
      const response = await api.post(`/appointments/${selectedBooking._id}/notes`, {
        text: newNote.trim(),
      });
      setNewNote('');
      // Update local state with the new note array from response
      setNotes(Array.isArray(response.data.notes) ? response.data.notes : []);
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const getStatusVariant = (status) => {
    if (status === 'BOOKED') return 'delivered';
    if (status === 'CANCELLED') return 'error';
    if (status === 'COMPLETED') return 'success';
    return 'pending';
  };

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      <header>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Personal Scheduling Ledger</h1>
        <p className="mt-2 text-slate-500 font-medium">Managing your assigned appointment nodes and historical visit logs.</p>
      </header>

      <div className="bg-white rounded-[3rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Stakeholder Node</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Resolution Time</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Matrix State</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Protocols</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Utility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {bookings.map((booking) => (
                <tr key={booking._id} className="group hover:bg-slate-50 transition-colors duration-300">
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-5">
                      <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm ring-4 ring-white shadow-xl shadow-slate-900/10 group-hover:scale-110 transition-transform duration-500">
                        {booking.customerId?.name ? booking.customerId.name[0].toUpperCase() : '?'}
                      </div>
                      <div>
                        <p className="text-base font-bold text-slate-900 tracking-tight leading-none group-hover:text-blue-600 transition-colors uppercase">{booking.customerId?.name || 'EXTERNAL AGENT'}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{booking.customerId?.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-3">
                       <FiClock className="text-blue-500 h-4 w-4" />
                       <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">{new Date(booking.date).toLocaleDateString()}</p>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 mt-2 ml-7 uppercase tracking-widest bg-slate-100 w-fit px-2 py-0.5 rounded shadow-sm">{booking.time}</p>
                  </td>
                  <td className="px-10 py-7">
                    <Badge variant={getStatusVariant(booking.status)}>{booking.status.toUpperCase()}</Badge>
                  </td>
                  <td className="px-10 py-7">
                    <div className="flex gap-2">
                       {booking.status === 'Pending' && (
                         <>
                           <button
                             onClick={() => updateStatus(booking._id, 'BOOKED')}
                             className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                             title="Authorize"
                           >
                             <FiCheckCircle className="h-5 w-5" />
                           </button>
                           <button
                             onClick={() => updateStatus(booking._id, 'CANCELLED')}
                             className="h-10 w-10 flex items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                             title="Abuse Reverse"
                           >
                             <FiXCircle className="h-5 w-5" />
                           </button>
                         </>
                       )}
                    </div>
                  </td>
                  <td className="px-10 py-7 text-right">
                    <button
                      onClick={() => openNotes(booking)}
                      className="btn-secondary py-2.5 px-6 text-[9px] font-black uppercase tracking-[0.2em] bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white transition-all gap-2 flex items-center ml-auto"
                    >
                      <FiFileText className="h-4 w-4" />
                      View Audit Notes
                    </button>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-24 text-center opacity-30 select-none grayscale">
                    <div className="flex flex-col items-center">
                      <FiCalendar className="h-20 w-20 mb-6 text-slate-300" />
                      <p className="font-black uppercase tracking-[0.3em] text-sm text-slate-400">Ledger Buffer Empty</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-auto px-10 py-8 border-t border-slate-100 flex items-center justify-between bg-slate-50/20">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Personal Scheduling Node • Node Operational</p>
           <div className="flex gap-3">
             <button
               disabled={page === 1}
               onClick={() => setPage(p => p - 1)}
               className="btn-secondary h-12 px-6 text-[10px] uppercase font-black tracking-widest disabled:opacity-30"
             >
               Previous
             </button>
             <button
               onClick={() => setPage(p => p + 1)}
               className="btn-primary h-12 px-8 text-[10px] uppercase font-black tracking-widest shadow-none"
             >
               Next
             </button>
           </div>
        </div>
      </div>

      {/* Audit Notes Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl border border-slate-200/60 overflow-hidden flex flex-col"
            >
              <header className="px-10 py-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                   <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Audit Logs</h2>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{selectedBooking.customerId?.name || 'EXTERNAL NODE'}</p>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                >
                  <FiXCircle className="h-6 w-6" />
                </button>
              </header>

              <div className="p-10 flex flex-col gap-10 flex-1 overflow-hidden">
                <div className="bg-slate-50 rounded-[2rem] border border-slate-100 p-8 shadow-inner">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">New Intelligence Entry</label>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={4}
                    placeholder="Document resolution details..."
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-5 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all shadow-sm"
                  />
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={addNote}
                      disabled={!newNote.trim()}
                      className="btn-primary py-3 px-8 text-[10px] font-black uppercase tracking-widest shadow-none gap-2 flex items-center"
                    >
                      <FiPlus className="h-4 w-4" />
                      Append Note
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                  <header className="flex items-center justify-between px-2 mb-4">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">History Log</p>
                     <FiFileText className="text-slate-200 h-5 w-5" />
                  </header>
                      {notes.map((note) => (
                        <motion.div 
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          key={note._id || Math.random()} 
                          className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all group"
                        >
                          <div className="flex items-center justify-between mb-2">
                             <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
                                {new Date(note.createdAt).toLocaleString()}
                             </p>
                             <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] group-hover:text-slate-400 transition-colors">By: {note.createdBy?.name || 'OPERATIVE'}</p>
                          </div>
                          <p className="text-sm font-medium text-slate-700 leading-relaxed">{note.text}</p>
                        </motion.div>
                      ))}
                  {notes.length === 0 && (
                    <div className="py-12 flex flex-col items-center justify-center opacity-20 grayscale grayscale animate-pulse">
                       <FiFileText className="h-12 w-12 mb-4" />
                       <p className="text-[10px] font-black uppercase tracking-widest">Zero Intelligence Logs</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StaffBookings;
