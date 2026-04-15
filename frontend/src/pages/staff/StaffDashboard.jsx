import { useEffect, useState } from 'react';
import api from '../../utils/api';

const StaffDashboard = () => {
  const [dashboardData, setDashboardData] = useState({});

  useEffect(() => {
    const fetchDashboardData = async () => {
      const response = await api.get('/dashboard/staff');
      setDashboardData(response.data);
    };
    fetchDashboardData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 md:p-8 text-white">
      <div className="mb-8 rounded-2xl backdrop-blur-md border border-white/10 shadow-xl bg-slate-950/30 p-6">
        <h1 className="text-4xl font-bold text-white">Staff Dashboard</h1>
        <p className="text-cyan-200 mt-2">Monitor your assigned chats and bookings.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        <div className="rounded-2xl backdrop-blur-md border border-white/10 shadow-xl bg-slate-950/30 p-6 transition-all duration-300 hover:shadow-2xl hover:border-white/20">
          <p className="text-sm font-medium text-cyan-200">Assigned Chats</p>
          <p className="mt-4 text-4xl font-bold text-white">{dashboardData.assignedChatsCount ?? 0}</p>
        </div>
        <div className="rounded-2xl backdrop-blur-md border border-white/10 shadow-xl bg-slate-950/30 p-6 transition-all duration-300 hover:shadow-2xl hover:border-white/20">
          <p className="text-sm font-medium text-cyan-200">Today's Bookings</p>
          <p className="mt-4 text-4xl font-bold text-white">{dashboardData.todaysBookings ?? 0}</p>
        </div>
        <div className="rounded-2xl backdrop-blur-md border border-white/10 shadow-xl bg-slate-950/30 p-6 transition-all duration-300 hover:shadow-2xl hover:border-white/20">
          <p className="text-sm font-medium text-amber-200">Pending Tasks</p>
          <p className="mt-4 text-4xl font-bold text-white">0</p>
        </div>
        <div className="rounded-2xl backdrop-blur-md border border-white/10 shadow-xl bg-slate-950/30 p-6 transition-all duration-300 hover:shadow-2xl hover:border-white/20">
          <p className="text-sm font-medium text-emerald-200">Completed Today</p>
          <p className="mt-4 text-4xl font-bold text-white">0</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl backdrop-blur-md border border-white/10 shadow-xl bg-slate-950/30 p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Recent Chats</h2>
          <div className="space-y-4">
            {dashboardData.recentChats?.map((chat) => (
              <div key={chat._id} className="flex items-center justify-between p-4 bg-slate-900/30 backdrop-blur-sm border border-white/10 rounded-xl">
                <div>
                  <p className="font-semibold text-white">{chat.customerId?.name || 'Unknown'}</p>
                  <p className="text-sm text-slate-300">Status: {chat.status || 'Active'}</p>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {new Date(chat.updatedAt).toLocaleDateString()}
                </span>
              </div>
            )) || <p className="text-slate-500 text-center py-4">No recent chats</p>}
          </div>
        </div>

        <div className="rounded-2xl backdrop-blur-md border border-white/10 shadow-xl bg-slate-950/30 p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Recent Bookings</h2>
          <div className="space-y-4">
            {dashboardData.recentBookings?.map((booking) => (
              <div key={booking._id} className="flex items-center justify-between p-4 bg-slate-900/30 backdrop-blur-sm border border-white/10 rounded-xl">
                <div>
                  <p className="font-semibold text-white">{booking.customerId?.name || 'Unknown'}</p>
                  <p className="text-sm text-slate-300">
                    {new Date(booking.date).toLocaleDateString()} - {booking.timeSlot}
                  </p>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold mt-2 inline-block ${
                    booking.status === 'Confirmed'
                      ? 'bg-green-500/10 backdrop-blur-sm border border-green-500/20 text-green-100'
                      : booking.status === 'Cancelled'
                      ? 'bg-red-500/10 backdrop-blur-sm border border-red-500/20 text-red-100'
                      : 'bg-amber-500/10 backdrop-blur-sm border border-amber-400/30 text-amber-100'
                  }`}>
                    {booking.status}
                  </span>
                </div>
              </div>
            )) || <p className="text-slate-500 text-center py-4">No recent bookings</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
