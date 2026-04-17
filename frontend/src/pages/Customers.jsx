import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiUsers, FiFilter, FiActivity, FiUser } from 'react-icons/fi';
import api from '../utils/api';
import useAnalyticsStore from '../store/analyticsStore';
import { getDateRangePayload } from '../utils/dateRange';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const dateRange = useAnalyticsStore((state) => state.dateRange);
  const searchQuery = useAnalyticsStore((state) => state.searchQuery);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const fetchCustomers = async () => {
    try {
      const { from, to } = getDateRangePayload(dateRange);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (searchQuery) params.set('search', searchQuery);

      const response = await api.get(`/customers?${params.toString()}`);
      setCustomers(response.data.customers || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, dateRange, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [dateRange, searchQuery]);

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
    <div className="space-y-10 animate-fade-in pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Customers</h1>
          <p className="mt-2 text-slate-500 font-medium tracking-tight">View and manage your customer information and history.</p>
        </div>
        <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Customers</p>
           <p className="text-sm font-bold text-slate-900 mt-1 uppercase">{total} Customers Found</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Active Cohort', value: metrics.totalCustomers, sub: 'Population (Current Frame)', icon: FiUsers, color: 'blue' },
          { label: 'Verified Nodes', value: metrics.existingCustomers, sub: 'Conversion Baseline', icon: FiActivity, color: 'emerald' },
          { label: 'Interaction Hits', value: metrics.totalOrders, sub: 'Aggregate Transaction Yield', icon: FiFilter, color: 'indigo' },
          { label: 'Latency Nodes', value: metrics.pendingPayments, sub: 'Unresolved Settlements', icon: FiUser, color: 'rose' },
        ].map((m, i) => (
          <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm flex flex-col justify-between h-40">
             <div className="flex justify-between items-start">
               <div className={`h-12 w-12 rounded-2xl bg-${m.color}-50 flex items-center justify-center text-${m.color}-600 shadow-sm`}>
                  <m.icon className="h-6 w-6" />
               </div>
               <div className={`h-2 w-2 rounded-full bg-${m.color}-500 animate-pulse`} />
             </div>
             <div>
               <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{m.value}</p>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{m.sub}</p>
             </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Identity Node</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Coordinate (Phone)</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Resource Vector</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">System State</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Utility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {customers.map((customer) => (
                <tr key={customer._id} className="group hover:bg-slate-50 transition-colors duration-300">
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-5">
                       <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-sm ring-4 ring-white shadow-sm group-hover:scale-110 transition-transform duration-500">
                          {customer.name ? customer.name[0].toUpperCase() : '?'}
                       </div>
                       <div>
                          <p className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight uppercase">{customer.name || 'ANONYMOUS NODE'}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{customer.age || '-'} Age Units</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-10 py-7">
                    <p className="text-sm font-black text-slate-900 tracking-tighter bg-slate-50 w-fit px-3 py-1 rounded-lg border border-slate-100">{customer.phone}</p>
                  </td>
                  <td className="px-10 py-7">
                    <p className="text-xs font-bold text-slate-500 max-w-[220px] truncate leading-none">{customer.address || 'LOC: UNDEFINED'}</p>
                  </td>
                  <td className="px-10 py-7">
                    <span className={`inline-flex px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${customer.status === 'existing' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-100 text-slate-500 border border-slate-200/50'}`}>
                      {customer.status}
                    </span>
                  </td>
                  <td className="px-10 py-7 text-right">
                    <button
                      onClick={() => handleViewDetails(customer)}
                      className="btn-secondary py-2 px-5 text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all"
                    >
                      Audit
                    </button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                   <td colSpan={5} className="py-24 text-center opacity-30 italic font-black uppercase tracking-[0.2em] text-sm">Matrix Data Buffer Empty</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {total > limit && (
          <div className="mt-auto px-10 py-8 border-t border-slate-100 flex items-center justify-between bg-white">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matrix Page {page} of {totalPages}</p>
             <div className="flex gap-4">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary h-12 px-6 text-[10px] uppercase font-black">Back Node</button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-primary h-12 px-8 text-[10px] uppercase font-black shadow-none">Advance Node</button>
             </div>
          </div>
        )}
      </div>

      {showDetails && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowDetails(false)} />
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-5xl overflow-hidden rounded-[3rem] bg-white shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
              <div className="mb-12 flex items-center justify-between">
                <div>
                   <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight uppercase leading-none">Node Audit Summary</h2>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">Verified Identity Analytics</p>
                </div>
                <button onClick={() => setShowDetails(false)} className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:scale-110 transition-all duration-300"><FiX className="h-6 w-6" /></button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
                 <div className="space-y-8">
                    <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Identity Profile</p>
                       <div className="flex items-center gap-6">
                          <div className="h-20 w-20 rounded-[1.8rem] bg-slate-900 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-slate-900/20">{selectedCustomer.name ? selectedCustomer.name[0].toUpperCase() : '?'}</div>
                          <div>
                             <p className="text-2xl font-black text-slate-900 tracking-tight">{selectedCustomer.name}</p>
                             <p className="text-sm font-black text-blue-600 mt-1 uppercase tracking-widest">{selectedCustomer.phone}</p>
                          </div>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                       <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Financial Matrix</p>
                          <p className="text-sm font-black text-slate-900 mt-2 truncate uppercase tracking-tighter">{selectedCustomer.upiId || 'UNLINKED'}</p>
                       </div>
                       <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aggregate Hits</p>
                          <p className="text-sm font-black text-slate-900 mt-2 tracking-tighter">{selectedCustomer.totalOrders || 0} COMPLETED TRANSACTIONS</p>
                       </div>
                    </div>
                 </div>

                 <div className="flex flex-col h-full">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Intelligence Interface (Agent Notes)</p>
                    <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-inner flex-1 flex flex-col overflow-hidden">
                       <textarea 
                         value={newNote} 
                         onChange={(e) => setNewNote(e.target.value)}
                         placeholder="Input tactical intelligence..."
                         className="w-full flex-1 bg-transparent p-6 text-sm font-medium text-slate-700 outline-none resize-none leading-relaxed"
                       />
                       <div className="p-4 bg-slate-50 border-t border-slate-100">
                          <button onClick={handleAddNote} className="btn-primary w-full py-4 text-[10px] uppercase font-black tracking-widest shadow-none h-auto">Sync New Intelligence</button>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="space-y-6">
                 <header className="flex items-center justify-between px-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historical Intelligence Ledger</p>
                 </header>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {notes.map((note) => (
                       <div key={note._id} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-start justify-between group">
                          <div>
                             <p className="text-[8px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2">{new Date(note.createdAt).toLocaleString()}</p>
                             <p className="text-sm font-semibold text-slate-700 leading-relaxed">{note.content}</p>
                          </div>
                          <button onClick={() => handleDeleteNote(note._id)} className="h-8 w-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white hover:border-rose-500 shadow-sm"><FiX /></button>
                       </div>
                    ))}
                 </div>
                 {notes.length === 0 && (
                    <div className="py-16 text-center bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Historical Buffer At 0%</p>
                    </div>
                 )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Customers;
