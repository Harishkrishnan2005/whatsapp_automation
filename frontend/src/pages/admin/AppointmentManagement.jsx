import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCalendar, FiUser, FiCheckCircle, FiXCircle, FiClock, FiUsers, FiFilter, FiEdit2, FiActivity, FiX, FiFileText, FiShield, FiCornerDownRight } from 'react-icons/fi';
import api from '../../utils/api';
import useAnalyticsStore from '../../store/analyticsStore';
import { getDateRangePayload } from '../../utils/dateRange';
import Badge from '../../components/ui/Badge';

const AppointmentManagement = () => {
  const [appointments, setAppointments] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [clientPage, setClientPage] = useState(1);
  const [editingApt, setEditingApt] = useState(null);
  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '' });
  const [selectedAuditApt, setSelectedAuditApt] = useState(null);
  const [newNote, setNewNote] = useState('');
  const timelineRef = useRef(null);
  
  const clientLimit = 10;
  const dateRange = useAnalyticsStore((state) => state.dateRange);
  const searchQuery = useAnalyticsStore((state) => state.searchQuery);

  const fetchAppointments = async () => {
    try {
      const { from, to } = getDateRangePayload(dateRange);
      const params = new URLSearchParams({ page: '1', limit: '200' });
      
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
      setAppointments(response.data.appointments || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const fetchStaffUsers = async () => {
    try {
      const response = await api.get('/auth/staff');
      setStaffUsers(response.data);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchStaffUsers();

    // REAL-TIME SYNC: Background polling every 30s to ensure multi-role synchronization
    const interval = setInterval(fetchAppointments, 30000);
    return () => clearInterval(interval);
  }, [dateRange, searchQuery]);

  // Auto-scroll to latest note in timeline
  useEffect(() => {
    if (selectedAuditApt && timelineRef.current) {
      setTimeout(() => {
        timelineRef.current?.scrollTo({
          top: timelineRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [selectedAuditApt, selectedAuditApt?.notes?.length]);

  const updateStatus = async (id, status, metadata = {}) => {
    try {
      await api.put(`/appointments/${id}/status`, { status, ...metadata });
      fetchAppointments();
      if (selectedAuditApt?._id === id) {
        fetchAuditDetails(id);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    if (!editingApt) return;
    await updateStatus(editingApt._id, 'RESCHEDULED', { 
      date: rescheduleData.date,
      time: rescheduleData.time
    });
    setEditingApt(null);
  };

  const assignStaff = async (id, assignedTo) => {
    try {
      await api.put(`/appointments/${id}/assign`, { assignedTo });
      fetchAppointments();
      if (selectedAuditApt?._id === id) {
        fetchAuditDetails(id);
      }
    } catch (error) {
      console.error('Error assigning staff:', error);
    }
  };

  const fetchAuditDetails = async (id) => {
    try {
      const response = await api.get(`/appointments/${id}`);
      setSelectedAuditApt({
        ...response.data,
        notes: Array.isArray(response.data?.notes) ? response.data.notes : [],
        auditLogs: Array.isArray(response.data?.auditLogs) ? response.data.auditLogs : [],
      });
    } catch (error) {
      console.error('Error fetching audit details:', error);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedAuditApt) return;
    try {
      await api.post(`/appointments/${selectedAuditApt._id}/notes`, {
        text: newNote,
      });
      setNewNote('');
      fetchAuditDetails(selectedAuditApt._id);
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const getStatusVariant = (status) => {
    switch(status) {
      case 'BOOKED': return 'delivered';
      case 'RESCHEDULED': return 'pending';
      case 'CANCELLED': return 'error';
      case 'COMPLETED': return 'success';
      default: return 'pending';
    }
  };

  const stats = useMemo(() => {
    return appointments.reduce(
      (acc, apt) => {
        acc.total += 1;
        if (apt.status === 'BOOKED' || apt.status === 'RESCHEDULED') acc.active += 1;
        if (apt.status === 'COMPLETED') acc.completed += 1;
        return acc;
      },
      { total: 0, active: 0, completed: 0 }
    );
  }, [appointments]);

  const visibleAppointments = useMemo(() => {
    const start = (clientPage - 1) * clientLimit;
    return appointments.slice(start, start + clientLimit);
  }, [appointments, clientPage]);

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Header & Intelligence Hub */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
             <h1 className="text-3xl font-black text-slate-900 tracking-tight">Appointments</h1>
             <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Scheduling Infrastructure</span>
          </div>
          <p className="mt-1 text-slate-500 font-medium tracking-tight">Managing global service slots and specialist allocation matrices.</p>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200/60 shadow-sm w-full xl:w-auto">
          <div className="flex-1 xl:w-80 relative group">
            <FiFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search scheduling network..." 
              value={searchQuery}
              onChange={(e) => useAnalyticsStore.getState().setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-xl pl-11 pr-12 py-3 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[10px] font-black text-slate-400">
               ⌘ K
            </div>
          </div>
          <div className="flex items-center gap-4 px-6 border-l border-slate-100">
            <div className="flex -space-x-3">
              {staffUsers.slice(0, 3).map(s => (
                <div key={s._id} className="h-9 w-9 rounded-xl border-2 border-white bg-slate-900 flex items-center justify-center text-[10px] font-black text-white shadow-lg">
                  {s.name ? s.name[0].toUpperCase() : '?'}
                </div>
              ))}
            </div>
            <div>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Team</p>
               <p className="text-xs font-black text-slate-900 mt-1 uppercase leading-none">{staffUsers.length} Nodes</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Resource Matrix */}
      <section className="grid gap-6 sm:grid-cols-3">
        {[
          { label: 'Total Volume', val: stats.total, icon: FiCalendar, col: 'blue' },
          { label: 'Active Slots', val: stats.active, icon: FiActivity, col: 'indigo' },
          { label: 'Resolved', val: stats.completed, icon: FiCheckCircle, col: 'emerald' },
        ].map((s, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm flex flex-col gap-8 relative overflow-hidden group"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-${s.col}-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700`} />
            <div className={`h-14 w-14 rounded-2xl bg-${s.col}-50 flex items-center justify-center text-${s.col}-600`}>
              <s.icon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{s.val}</p>
              <p className="text-[10px] font-black text-slate-400 mt-3 uppercase tracking-widest leading-none">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </section>

      <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Service</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Schedule</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Specialist</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Utility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibleAppointments.map((apt) => (
                <tr key={apt._id} className="group hover:bg-slate-50 transition-colors duration-300">
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                        {apt.customerId?.name ? apt.customerId.name[0].toUpperCase() : '?'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 tracking-tight uppercase">{apt.customerId?.name || 'GUEST'}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{apt.customerId?.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-7 text-[10px] font-black text-blue-600 uppercase tracking-widest">
                    {apt.service}
                  </td>
                  <td className="px-10 py-7">
                    <p className="text-sm font-black text-slate-800 tracking-tighter uppercase">{new Date(apt.date).toLocaleDateString()}</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">{apt.time}</p>
                  </td>
                  <td className="px-10 py-7">
                    <select
                      value={apt.assignedTo?._id || ''}
                      onChange={(e) => assignStaff(apt._id, e.target.value)}
                      className="rounded-xl border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none hover:bg-white transition-all border"
                    >
                      <option value="">UNASSIGNED</option>
                      {staffUsers.map((s) => (
                        <option key={s._id} value={s._id}>{s.name.toUpperCase()}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-10 py-7">
                    <Badge variant={getStatusVariant(apt.status)}>{apt.status}</Badge>
                  </td>
                  <td className="px-10 py-7 text-right">
                    <div className="flex justify-end gap-2">
                       <button onClick={() => fetchAuditDetails(apt._id)} className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm" title="Audit Lifecycle"><FiShield /></button>
                       <button onClick={() => { setEditingApt(apt); setRescheduleData({ date: new Date(apt.date).toISOString().split('T')[0], time: apt.time }); }} className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm"><FiEdit2 /></button>
                       {apt.status !== 'CANCELLED' && (
                         <button onClick={() => updateStatus(apt._id, 'CANCELLED')} className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm"><FiXCircle /></button>
                       )}
                       {apt.status !== 'COMPLETED' && (
                         <button onClick={() => updateStatus(apt._id, 'COMPLETED')} className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all shadow-sm"><FiCheckCircle /></button>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reschedule Modal */}
      <AnimatePresence>
        {editingApt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingApt(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl">
                <button onClick={() => setEditingApt(null)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900"><FiX /></button>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-8 text-center">Reschedule Slot</h3>
                <form onSubmit={handleReschedule} className="space-y-6">
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">Target Date</label>
                      <input type="date" value={rescheduleData.date} onChange={e => setRescheduleData({...rescheduleData, date: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" required />
                   </div>
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">Temporal Window</label>
                      <input type="time" value={rescheduleData.time} onChange={e => setRescheduleData({...rescheduleData, time: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" required />
                   </div>
                   <button type="submit" className="w-full py-5 rounded-[1.5rem] bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all mt-6">Update Protocol</button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADMIN AUDIT PAGE - Modern Timeline Interface */}
      <AnimatePresence>
        {selectedAuditApt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/50 backdrop-blur-md" onClick={() => setSelectedAuditApt(null)} />
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative bg-white w-full max-w-6xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden">
                
                {/* Sticky Header */}
                <header className="px-10 py-8 border-b border-slate-100 bg-white shrink-0 flex items-center justify-between z-20">
                   <div className="flex items-center gap-6">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-slate-900/20">
                        {selectedAuditApt.customerId?.name ? selectedAuditApt.customerId.name[0].toUpperCase() : '?'}
                      </div>
                      <div>
                         <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{selectedAuditApt.customerId?.name}</h2>
                            <Badge variant={getStatusVariant(selectedAuditApt.status)}>{selectedAuditApt.status}</Badge>
                         </div>
                         <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{selectedAuditApt.customerId?.phone}</p>
                      </div>
                   </div>
                   <button onClick={() => setSelectedAuditApt(null)} className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all"><FiX className="h-6 w-6" /></button>
                </header>

                <div className="flex-1 overflow-hidden flex">
                   {/* LEFT PANEL - Appointment Details */}
                   <div className="w-80 border-r border-slate-100 bg-gradient-to-b from-slate-50 to-white overflow-y-auto custom-scrollbar shrink-0">
                      <div className="p-8 space-y-6">
                         <div>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Appointment Details</h3>
                            <div className="space-y-5">
                               <div className="bg-white p-4 rounded-xl border border-slate-100">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Service</p>
                                  <p className="text-sm font-black text-blue-600 uppercase">{selectedAuditApt.service}</p>
                               </div>

                               <div className="bg-white p-4 rounded-xl border border-slate-100">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date & Time</p>
                                  <div className="flex items-center gap-2">
                                     <FiCalendar className="h-4 w-4 text-slate-400" />
                                     <p className="text-sm font-bold text-slate-900 uppercase">{new Date(selectedAuditApt.date).toLocaleDateString()}</p>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2">
                                     <FiClock className="h-4 w-4 text-slate-400" />
                                     <p className="text-sm font-bold text-slate-900">{selectedAuditApt.time}</p>
                                  </div>
                               </div>

                               <div className="bg-white p-4 rounded-xl border border-slate-100">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assigned Staff</p>
                                  <div className="flex items-center gap-2">
                                     <div className="h-7 w-7 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-xs">
                                       {selectedAuditApt.assignedTo?.name ? selectedAuditApt.assignedTo.name[0].toUpperCase() : '—'}
                                     </div>
                                     <p className="text-sm font-bold text-slate-900 uppercase">{selectedAuditApt.assignedTo?.name || 'UNASSIGNED'}</p>
                                  </div>
                               </div>
                            </div>
                         </div>

                         <div className="pt-6 border-t border-slate-100">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Current Status</h3>
                            <div className="grid grid-cols-3 gap-3">
                               {['BOOKED', 'COMPLETED', 'CANCELLED'].map(s => (
                                  <button
                                    key={s}
                                    onClick={() => updateStatus(selectedAuditApt._id, s)}
                                    className={`p-3 rounded-lg font-black text-[9px] uppercase tracking-wider transition-all ${
                                      selectedAuditApt.status === s 
                                        ? 'bg-slate-900 text-white shadow-md' 
                                        : 'bg-white border border-slate-100 text-slate-600 hover:border-slate-300'
                                    }`}
                                  >
                                    {s}
                                  </button>
                               ))}
                            </div>
                         </div>

                         <div className="pt-6 border-t border-slate-100">
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                               <div className="flex items-start gap-2">
                                  <FiShield className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                                  <div>
                                     <p className="text-[9px] font-black text-blue-600 uppercase tracking-wider">Admin-Only View</p>
                                     <p className="text-[8px] font-bold text-blue-500 mt-1 leading-tight">Notes are read-only. Staff can add notes from their dashboard.</p>
                                  </div>
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* RIGHT PANEL - Notes Timeline */}
                   <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="px-10 py-6 border-b border-slate-100 bg-white shrink-0">
                         <div className="flex items-center gap-3">
                            <FiFileText className="h-5 w-5 text-blue-600" />
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Activity Timeline</h3>
                            <span className="ml-auto text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-lg">{(selectedAuditApt.notes || []).length} notes</span>
                         </div>
                      </div>

                      {/* Timeline Container */}
                      <div ref={timelineRef} className="flex-1 overflow-y-auto custom-scrollbar px-10 py-8 bg-gradient-to-b from-white to-slate-50/50">
                         {(selectedAuditApt.notes || []).length > 0 ? (
                            <div className="space-y-6 relative">
                               {/* Timeline line background */}
                               <div className="absolute left-[27px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 via-slate-200 to-slate-100" />

                               {selectedAuditApt.notes.slice().reverse().map((note, i) => (
                                  <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="relative pl-20"
                                  >
                                     {/* Timeline dot */}
                                     <div className="absolute left-0 top-0 h-14 w-14 rounded-full bg-white border-4 border-blue-500 flex items-center justify-center shadow-md ring-4 ring-blue-50">
                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center text-white font-bold text-sm">
                                          {note.createdBy?.name ? note.createdBy.name[0].toUpperCase() : 'N'}
                                        </div>
                                     </div>

                                     {/* Note Card */}
                                     <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-200">
                                        <div className="flex items-start justify-between mb-3">
                                           <div>
                                              <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{note.createdBy?.name || 'Anonymous Staff'}</p>
                                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                {new Date(note.createdAt).toLocaleString('en-US', { 
                                                   month: 'short', 
                                                   day: 'numeric',
                                                   year: 'numeric',
                                                   hour: '2-digit',
                                                   minute: '2-digit'
                                                })}
                                              </p>
                                           </div>
                                           <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider">Note</div>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap">{note.text}</p>
                                     </div>
                                  </motion.div>
                               ))}
                            </div>
                         ) : (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="h-full flex items-center justify-center"
                            >
                               <div className="text-center">
                                  <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                     <FiFileText className="h-12 w-12 text-slate-300" />
                                  </div>
                                  <h4 className="text-sm font-black text-slate-500 uppercase tracking-tight">No Notes Yet</h4>
                                  <p className="text-xs font-bold text-slate-400 uppercase mt-2 tracking-wider">Staff will add notes as they work on this appointment</p>
                               </div>
                            </motion.div>
                         )}
                      </div>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AppointmentManagement;
