import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCalendar, FiUser, FiCheckCircle, FiXCircle, FiClock, FiUsers, FiFilter, FiEdit2, FiActivity, FiX } from 'react-icons/fi';
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
  
  const clientLimit = 10;
  const dateRange = useAnalyticsStore((state) => state.dateRange);
  const searchQuery = useAnalyticsStore((state) => state.searchQuery);

  const fetchAppointments = async () => {
    try {
      const { from, to } = getDateRangePayload(dateRange);
      const params = new URLSearchParams({ page: '1', limit: '200' });
      
      // If it's the default "last_7_days" or "today", we actually want to see future appointments too
      // on this specific management page. So we'll extend the 'to' date significantly.
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
  }, [dateRange, searchQuery]);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/appointments/${id}/status`, { status });
      fetchAppointments();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    if (!editingApt) return;
    try {
      await api.put(`/appointments/${editingApt._id}/status`, { 
        status: 'RESCHEDULED',
        date: rescheduleData.date,
        time: rescheduleData.time
      });
      setEditingApt(null);
      fetchAppointments();
    } catch (error) {
      console.error('Error rescheduling:', error);
    }
  };

  const assignStaff = async (id, assignedTo) => {
    try {
      await api.put(`/appointments/${id}/assign`, { assignedTo });
      fetchAppointments();
    } catch (error) {
      console.error('Error assigning staff:', error);
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
    <div className="space-y-10 animate-fade-in pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Booking Control</h1>
          <p className="mt-2 text-slate-500 font-medium tracking-tight">Manage appointments, reschedule slots, and assign service specialists.</p>
        </div>
        <div className="flex items-center gap-6 bg-white px-6 py-4 rounded-[1.5rem] border border-slate-200/60 shadow-sm">
          <div className="flex -space-x-4">
            {staffUsers.slice(0, 4).map(s => (
              <div key={s._id} className="h-10 w-10 rounded-full border-4 border-white bg-slate-900 flex items-center justify-center text-[10px] font-black text-white shadow-xl shadow-slate-900/10 transition-transform hover:scale-110 cursor-default">
                {s.name ? s.name[0].toUpperCase() : '?'}
              </div>
            ))}
          </div>
          <div className="text-left border-l border-slate-100 pl-6">
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">Specialist Pool</p>
             <p className="text-sm font-black text-slate-900 mt-1 uppercase leading-none">{staffUsers.length} Staff</p>
          </div>
        </div>
      </header>

      <section className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
        {[
          { label: 'Total Volume', val: stats.total, icon: FiCalendar, col: 'blue' },
          { label: 'Active Sessions', val: stats.active, icon: FiActivity, col: 'indigo' },
          { label: 'Resolved Nodes', val: stats.completed, icon: FiCheckCircle, col: 'emerald' },
        ].map((s, i) => (
          <motion.div 
            key={i} 
            whileHover={{ y: -5 }}
            className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40"
          >
            <div className="flex items-center gap-6">
              <div className={`h-16 w-16 rounded-[1.5rem] bg-${s.col}-50 flex items-center justify-center text-${s.col}-600 shadow-sm`}>
                <s.icon className="h-8 w-8" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                <p className="text-3xl font-black text-slate-900 tracking-tighter mt-1">{s.val}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer Node</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Service Protocol</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Temporal Slot</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Staff Owner</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">State</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
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
                    {apt.service || 'General'}
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
                      <option value="">NODE: UNASSIGNED</option>
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
                       <button onClick={() => { setEditingApt(apt); setRescheduleData({ date: new Date(apt.date).toISOString().split('T')[0], time: apt.time }); }} className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all"><FiEdit2 /></button>
                       {apt.status !== 'CANCELLED' && (
                         <button onClick={() => updateStatus(apt._id, 'CANCELLED')} className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"><FiXCircle /></button>
                       )}
                       {apt.status !== 'COMPLETED' && (
                         <button onClick={() => updateStatus(apt._id, 'COMPLETED')} className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all"><FiCheckCircle /></button>
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
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-8">Reschedule Protocol</h3>
                
                <form onSubmit={handleReschedule} className="space-y-6">
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">New Target Date</label>
                      <input type="date" value={rescheduleData.date} onChange={e => setRescheduleData({...rescheduleData, date: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" required />
                   </div>
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">Temporal Window (Time)</label>
                      <input type="time" value={rescheduleData.time} onChange={e => setRescheduleData({...rescheduleData, time: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" required />
                   </div>
                   
                   <button type="submit" className="w-full py-5 rounded-[1.5rem] bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all mt-6">
                      Execute Re-scheduling
                   </button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AppointmentManagement;
