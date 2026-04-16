import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import useAnalyticsStore from '../../store/analyticsStore';
import { getDateRangePayload } from '../../utils/dateRange';

const AppointmentManagement = () => {
  const [appointments, setAppointments] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [clientPage, setClientPage] = useState(1);
  const clientLimit = 10;
  const dateRange = useAnalyticsStore((state) => state.dateRange);
  const searchQuery = useAnalyticsStore((state) => state.searchQuery);

  const clientTotalPages = Math.max(1, Math.ceil(appointments.length / clientLimit));
  const visibleAppointments = useMemo(() => {
    const start = (clientPage - 1) * clientLimit;
    return appointments.slice(start, start + clientLimit);
  }, [appointments, clientPage, clientLimit]);
  const appointmentStats = useMemo(() => {
    return appointments.reduce(
      (acc, apt) => {
        acc.total += 1;
        if (apt.status === 'Confirmed') acc.confirmed += 1;
        if (apt.status === 'Pending') acc.pending += 1;
        if (apt.status === 'Cancelled') acc.cancelled += 1;
        if (apt.assignedTo?._id) acc.assigned += 1;
        return acc;
      },
      { total: 0, confirmed: 0, pending: 0, cancelled: 0, assigned: 0 }
    );
  }, [appointments]);

  useEffect(() => {
    fetchAppointments();
    fetchStaffUsers();
  }, [dateRange, searchQuery]);

  useEffect(() => {
    setClientPage(1);
  }, [dateRange, searchQuery]);

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

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/appointments/${id}/status`, { status });
      fetchAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-4 md:p-8">
      <div className="mb-8 rounded-2xl border border-blue-400/20 bg-slate-950/40 p-6 shadow-2xl backdrop-blur-md">
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">Operations Hub</p>
        <h1 className="mt-2 text-4xl font-bold text-white">Appointment Management</h1>
        <p className="mt-2 text-cyan-100/80">Schedule, assign, and manage customer appointments.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-blue-400/20 bg-slate-950/40 p-6 shadow-xl backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Total Appointments</p>
          <p className="mt-3 text-4xl font-bold text-white">{appointmentStats.total}</p>
        </div>
        <div className="rounded-2xl border border-cyan-400/25 bg-slate-950/40 p-6 shadow-xl backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Assigned</p>
          <p className="mt-3 text-4xl font-bold text-white">{appointmentStats.assigned}</p>
        </div>
        <div className="rounded-2xl border border-emerald-400/25 bg-slate-950/40 p-6 shadow-xl backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Confirmed</p>
          <p className="mt-3 text-4xl font-bold text-white">{appointmentStats.confirmed}</p>
        </div>
        <div className="rounded-2xl border border-amber-400/25 bg-slate-950/40 p-6 shadow-xl backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Pending</p>
          <p className="mt-3 text-4xl font-bold text-white">{appointmentStats.pending}</p>
        </div>
        <div className="rounded-2xl border border-red-400/25 bg-slate-950/40 p-6 shadow-xl backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-200">Cancelled</p>
          <p className="mt-3 text-4xl font-bold text-white">{appointmentStats.cancelled}</p>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-blue-400/20 bg-slate-950/35 shadow-2xl backdrop-blur-md">
        <table className="w-full">
          <thead className="border-b border-blue-400/20 bg-slate-900/50">
            <tr>
              <th className="p-4 text-left font-semibold text-cyan-100">Customer</th>
              <th className="p-4 text-left font-semibold text-cyan-100">Date & Time Slot</th>
              <th className="p-4 text-left font-semibold text-cyan-100">Assigned To</th>
              <th className="p-4 text-left font-semibold text-cyan-100">Status</th>
              <th className="p-4 text-center font-semibold text-cyan-100">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleAppointments.map((apt) => (
              <tr key={apt._id} className="border-t border-blue-400/15 hover:bg-white/5 transition-colors">
                <td className="p-4 text-slate-100">
                  {apt.customerId?.name} ({apt.customerId?.phone})
                </td>
                <td className="p-4 text-cyan-100/80">
                  {new Date(apt.date).toLocaleDateString()} - {apt.timeSlot}
                </td>
                <td className="p-4">
                  <select
                    value={apt.assignedTo?._id || ''}
                    onChange={(e) => assignStaff(apt._id, e.target.value)}
                    className="rounded-lg border border-blue-400/30 bg-slate-900/60 px-3 py-1 text-sm text-cyan-100 outline-none focus:ring-2 focus:ring-cyan-400"
                  >
                    <option value="">Unassigned</option>
                    {staffUsers.map((staff) => (
                      <option key={staff._id} value={staff._id}>
                        {staff.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    apt.status === 'Confirmed'
                      ? 'border border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                      : apt.status === 'Cancelled'
                      ? 'border border-red-400/30 bg-red-500/15 text-red-200'
                      : 'border border-amber-400/30 bg-amber-500/15 text-amber-200'
                  }`}>
                    {apt.status}
                  </span>
                </td>
                <td className="p-4 flex flex-wrap justify-center gap-2">
                  {apt.status === 'Pending' && (
                    <>
                      <button
                        onClick={() => updateStatus(apt._id, 'Confirmed')}
                        className="rounded-lg border border-emerald-400/30 bg-emerald-500/20 px-3 py-1 text-sm text-emerald-100 transition-all hover:bg-emerald-500/30"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => updateStatus(apt._id, 'Cancelled')}
                        className="rounded-lg border border-red-400/30 bg-red-500/20 px-3 py-1 text-sm text-red-100 transition-all hover:bg-red-500/30"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {visibleAppointments.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-cyan-100/70">No appointments found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={() => setClientPage((prev) => Math.max(1, prev - 1))}
          disabled={clientPage === 1}
          className="rounded-lg border border-blue-400/25 bg-slate-900/60 px-4 py-2 font-semibold text-cyan-100 transition-all hover:bg-slate-800/70 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => setClientPage((prev) => Math.min(clientTotalPages, prev + 1))}
          disabled={clientPage >= clientTotalPages}
          className="rounded-lg border border-blue-400/35 bg-blue-500/30 px-4 py-2 font-semibold text-white transition-all hover:bg-blue-500/40 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default AppointmentManagement;
