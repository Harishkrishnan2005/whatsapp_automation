import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiMessageSquare, FiCalendar, FiActivity, FiCheckCircle } from 'react-icons/fi';
import api from '../../utils/api';

const StaffDashboard = () => {
  const [dashboardData, setDashboardData] = useState({});

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/dashboard/staff');
        setDashboardData(response.data || {});
      } catch (error) {
        console.error('Error fetching staff dashboard:', error);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      <header>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Specialist Dashboard</h1>
        <p className="mt-2 text-slate-500 font-medium">Monitoring assigned intelligence nodes and scheduling matrix.</p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Assigned Transmissions', val: dashboardData.assignedChatsCount ?? 0, icon: FiMessageSquare, col: 'blue' },
          { label: "Today's Scheduling", val: dashboardData.todaysBookings ?? 0, icon: FiCalendar, col: 'emerald' },
          { label: 'Pending Directives', val: 0, icon: FiActivity, col: 'indigo' },
          { label: 'Resolution Rate', val: '0%', icon: FiCheckCircle, col: 'rose' },
        ].map((s, i) => (
          <motion.div 
            key={i} 
            whileHover={{ y: -5 }}
            className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40"
          >
            <div className="flex items-center gap-6">
              <div className={`h-14 w-14 rounded-2xl bg-${s.col}-50 flex items-center justify-center text-${s.col}-600`}>
                <s.icon className="h-7 w-7" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                <p className="text-3xl font-black text-slate-900 tracking-tighter mt-1">{s.val}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="bg-white p-10 rounded-[3rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-8">Active Transmission Feed</h2>
          <div className="space-y-4">
            {dashboardData.recentChats?.map((chat) => (
              <div key={chat._id} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:bg-white hover:shadow-xl transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black">
                     {chat.customerId?.name ? chat.customerId.name[0].toUpperCase() : '?'}
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900 leading-none group-hover:text-blue-600 transition-colors uppercase">{chat.customerId?.name || 'EXTERNAL AGENT'}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Status: {chat.status || 'Active'}</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase text-slate-400">
                  {new Date(chat.updatedAt).toLocaleDateString()}
                </span>
              </div>
            )) || <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest text-center py-20 grayscale opacity-30">Zero Activity Found</p>}
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-8">Scheduling Ledger</h2>
          <div className="space-y-4">
            {dashboardData.recentBookings?.map((booking) => (
              <div key={booking._id} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:bg-white hover:shadow-xl transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-lg shadow-blue-500/10">
                     {booking.customerId?.name ? booking.customerId.name[0].toUpperCase() : '?'}
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900 leading-none group-hover:text-blue-600 transition-colors uppercase tracking-tighter">{booking.customerId?.name || 'EXTERNAL'}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 leading-none">
                      {new Date(booking.date).toLocaleDateString()} • {booking.timeSlot}
                    </p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                  booking.status === 'Confirmed' ? 'bg-emerald-600 text-white' : 
                  booking.status === 'Cancelled' ? 'bg-rose-600 text-white' : 
                  'bg-slate-900 text-white'
                }`}>
                  {booking.status}
                </div>
              </div>
            )) || <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest text-center py-20 grayscale opacity-30">Ledger Buffer Empty</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
