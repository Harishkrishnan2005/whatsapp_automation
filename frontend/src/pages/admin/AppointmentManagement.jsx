import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiCalendar, FiUser, FiCheckCircle, FiXCircle, FiClock, FiUsers, FiFilter } from 'react-icons/fi';
import api from '../../utils/api';
import useAnalyticsStore from '../../store/analyticsStore';
import { getDateRangePayload } from '../../utils/dateRange';
import Badge from '../../components/ui/Badge';

const AppointmentManagement = () => {
  const [appointments, setAppointments] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [clientPage, setClientPage] = useState(1);
  const clientLimit = 10;
  const dateRange = useAnalyticsStore((state) => state.dateRange);
  const searchQuery = useAnalyticsStore((state) => state.searchQuery);

  const fetchAppointments = async () => {
    try {
      const { from, to } = getDateRangePayload(dateRange);
      const params = new URLSearchParams({ page: '1', limit: '200' });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
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

  const assignStaff = async (id, assignedTo) => {
    try {
      await api.put(`/appointments/${id}/assign`, { assignedTo });
      fetchAppointments();
    } catch (error) {
      console.error('Error assigning staff:', error);
    }
  };

  const getStatusVariant = (status) => {
    if (status === 'Confirmed') return 'delivered';
    if (status === 'Cancelled') return 'error';
    if (status === 'Completed') return 'success';
    return 'pending';
  };

  const stats = useMemo(() => {
    return appointments.reduce(
      (acc, apt) => {
        acc.total += 1;
        if (apt.status === 'Confirmed') acc.confirmed += 1;
        if (apt.status === 'Pending') acc.pending += 1;
        return acc;
      },
      { total: 0, confirmed: 0, pending: 0 }
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
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Appointment Ledger</h1>
          <p className="mt-2 text-slate-500 font-medium tracking-tight">Synchronized scheduling and enterprise resource allocation matrix.</p>
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
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">Resource Pool</p>
             <p className="text-sm font-black text-slate-900 mt-1 uppercase leading-none">{staffUsers.length} Specialists</p>
          </div>
        </div>
      </header>

      <section className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
        {[
          { label: 'Total Volume', val: stats.total, icon: FiCalendar, col: 'blue' },
          { label: 'Confirmed Nodes', val: stats.confirmed, icon: FiCheckCircle, col: 'emerald' },
          { label: 'Pending Review', val: stats.pending, icon: FiClock, col: 'indigo' },
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

      <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col min-h-[650px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Stakeholder Node</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Scheduling Space</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Allocation Logic</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Resolution State</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Utility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibleAppointments.map((apt) => (
                <tr key={apt._id} className="group hover:bg-slate-50 transition-colors duration-300">
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-5">
                      <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm ring-4 ring-white shadow-xl shadow-slate-900/10 group-hover:scale-110 transition-transform duration-500">
                        {apt.customerId?.name ? apt.customerId.name[0].toUpperCase() : '?'}
                      </div>
                      <div>
                        <p className="text-base font-bold text-slate-900 tracking-tight leading-none group-hover:text-blue-600 transition-colors uppercase">{apt.customerId?.name || 'EXTERNAL AGENT'}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{apt.customerId?.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-3">
                       <div className="h-2 w-2 rounded-full bg-blue-500" />
                       <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">{new Date(apt.date).toLocaleDateString()}</p>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 mt-2 ml-5 uppercase tracking-widest bg-slate-100 w-fit px-2 py-0.5 rounded shadow-sm">{apt.timeSlot}</p>
                  </td>
                  <td className="px-10 py-7">
                    <select
                      value={apt.assignedTo?._id || ''}
                      onChange={(e) => assignStaff(apt._id, e.target.value)}
                      className="w-full rounded-2xl border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 focus:bg-white focus:ring-4 focus:ring-blue-500/5 outline-none transition-all cursor-pointer border hover:border-blue-500/20"
                    >
                      <option value="">NODE: UNALLOCATED</option>
                      {staffUsers.map((s) => (
                        <option key={s._id} value={s._id}>{s.name.toUpperCase()}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-10 py-7">
                    <Badge variant={getStatusVariant(apt.status)}>{apt.status.toUpperCase()}</Badge>
                  </td>
                  <td className="px-10 py-7 text-right">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                      {apt.status === 'Pending' ? (
                        <>
                          <button
                            onClick={() => updateStatus(apt._id, 'Confirmed')}
                            className="h-12 w-12 flex items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                            title="Authorize Node"
                          >
                            <FiCheckCircle className="h-6 w-6" />
                          </button>
                          <button
                            onClick={() => updateStatus(apt._id, 'Cancelled')}
                            className="h-12 w-12 flex items-center justify-center rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                            title="Abuse Reverse"
                          >
                            <FiXCircle className="h-6 w-6" />
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Resolution Fixed</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {visibleAppointments.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-24 text-center opacity-30 select-none">
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

        {appointments.length > clientLimit && (
          <div className="mt-auto px-10 py-8 border-t border-slate-100 flex items-center justify-between bg-slate-50/20">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Slot {((clientPage - 1) * clientLimit) + 1} — {Math.min(clientPage * clientLimit, appointments.length)} of {appointments.length} Resolution Nodes
            </p>
            <div className="flex gap-3">
              <button
                disabled={clientPage === 1}
                onClick={() => setClientPage(p => p - 1)}
                className="btn-secondary h-12 px-6 text-[10px] uppercase font-black tracking-widest"
              >
                Previous
              </button>
              <button
                disabled={clientPage >= Math.ceil(appointments.length / clientLimit)}
                onClick={() => setClientPage(p => p + 1)}
                className="btn-primary h-12 px-8 text-[10px] uppercase font-black tracking-widest shadow-none"
              >
                Next Node
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentManagement;
