import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFileText, FiUser, FiPlus, FiBox, FiMessageSquare, FiCalendar, FiClock } from 'react-icons/fi';
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
    <div className="space-y-10 animate-fade-in pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Intelligence Ledger</h1>
          <p className="mt-2 text-slate-500 font-medium tracking-tight">Managing persistent stakeholder narratives and operational audit notes.</p>
        </div>
        <div className="bg-white px-6 py-4 rounded-[1.5rem] border border-slate-200/60 shadow-sm flex items-center gap-4">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Assigned nodes</p>
           <p className="text-sm font-black text-slate-900 mt-1 uppercase leading-none">{customerCount} Stakeholders</p>
        </div>
      </header>

      <div className="flex gap-10">
        {/* Stakeholder Selection Matrix */}
        <aside className="w-1/3 flex flex-col bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden max-w-[400px]">
           <header className="p-8 border-b border-slate-50 bg-slate-50/20">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Active Nodes</h2>
           </header>
           <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 max-h-[700px]">
              {customers.map((customer) => (
                <button
                  key={customer._id}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`w-full p-6 text-left transition-all duration-500 rounded-[2rem] border-2 flex items-center gap-4 ${
                    selectedCustomer?._id === customer._id
                      ? 'bg-slate-900 border-slate-900 shadow-2xl shadow-slate-900/20'
                      : 'bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-100'
                  }`}
                >
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-sm ring-4 ring-white shadow-xl transition-all duration-500 ${
                    selectedCustomer?._id === customer._id ? 'bg-white text-slate-900 scale-110' : 'bg-blue-600 text-white'
                  }`}>
                    {customer.name ? customer.name[0].toUpperCase() : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-base font-black truncate leading-none uppercase tracking-tight ${selectedCustomer?._id === customer._id ? 'text-white' : 'text-slate-900'}`}>{customer.name || 'Unknown'}</p>
                    <p className={`text-[10px] font-black mt-2 uppercase tracking-widest ${selectedCustomer?._id === customer._id ? 'text-slate-400' : 'text-slate-400'}`}>{customer.phone || '-'}</p>
                  </div>
                </button>
              ))}
              {customers.length === 0 && (
                <div className="flex flex-col items-center justify-center p-20 opacity-20 select-none grayscale">
                   <FiUser className="h-12 w-12 mb-4 text-slate-300" />
                   <p className="text-[10px] font-black uppercase tracking-widest text-center">Node Matrix Empty</p>
                </div>
              )}
           </div>
        </aside>

        {/* Audit Log Terminal */}
        <main className="flex-1 flex flex-col bg-white rounded-[3rem] border border-slate-200/60 shadow-sm overflow-hidden relative">
          <header className="px-10 py-8 border-b border-slate-100 bg-white sticky top-0 z-10 flex items-center justify-between">
            <div className="flex items-center gap-6">
               <div className="h-16 w-16 rounded-[1.5rem] bg-slate-900 flex items-center justify-center text-white font-black text-xl shadow-2xl shadow-slate-900/20 ring-4 ring-white">
                  {selectedCustomer?.name ? selectedCustomer.name[0].toUpperCase() : '?'}
               </div>
               <div>
                  <h2 className="text-2xl font-black text-slate-900 leading-none tracking-tighter uppercase">{selectedCustomer?.name || 'Awaiting Selection'}</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Node History Log • {notes.length} Entries</p>
               </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
               <FiFileText className="h-5 w-5" />
            </div>
          </header>

          <div className="p-10 flex flex-col gap-10">
             <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 p-8 shadow-inner">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">New Intelligence Entry</label>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={4}
                  placeholder="Document stakeholder narrative..."
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all shadow-sm"
                />
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={addNote}
                    disabled={!selectedCustomer || !newNote.trim() || saving}
                    className="btn-primary py-4 px-10 text-[10px] font-black uppercase tracking-widest shadow-none gap-2 flex items-center h-auto rounded-2xl"
                  >
                    {saving ? 'Syncing...' : 'Append Node Note'}
                  </button>
                </div>
             </div>

             <div className="space-y-6">
                <header className="flex items-center justify-between px-2 mb-2">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historical Buffer</p>
                   <FiClock className="text-slate-200 h-5 w-5" />
                </header>
                {notes.map((note) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={note._id} 
                    className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-500 group"
                  >
                     <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] bg-blue-50 px-3 py-1 rounded-lg">
                           {new Date(note.createdAt).toLocaleString()}
                        </p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors">Operative: {note.createdBy?.name || 'System'}</p>
                     </div>
                     <p className="text-base font-medium text-slate-700 leading-relaxed tracking-tight">{note.content}</p>
                  </motion.div>
                ))}
                {notes.length === 0 && (
                  <div className="py-20 flex flex-col items-center justify-center opacity-10 grayscale select-none">
                     <FiFileText className="h-20 w-20 mb-6" />
                     <p className="font-black uppercase tracking-[0.4em] text-sm italic">Buffer Depleted</p>
                  </div>
                )}
             </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StaffNotes;
