import { useEffect, useMemo, useState } from 'react';
import { FiBox, FiCheckCircle, FiMessageCircle, FiShoppingCart, FiUsers, FiTrendingUp, FiActivity, FiCreditCard, FiCalendar } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Badge from '../components/ui/Badge';
import api from '../utils/api';

const formatDateTime = (value) => {
  if (!value) return '-';
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? '-' : dt.toLocaleString();
};

const getCustomerName = (customer) => customer?.name || customer?.phone || 'Unknown';
const getOrderStatus = (order) => order?.orderStatus || order?.status || 'Pending';
const getStatusClass = (status) => {
  const norm = String(status || '').toLowerCase();
  if (norm.includes('deliver') || norm.includes('paid')) return 'delivered';
  if (norm.includes('confirm')) return 'processed';
  if (norm.includes('cancel') || norm.includes('fail')) return 'cancelled';
  return 'pending';
};

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const dashboardResponse = await api.get('/dashboard/admin');
      const subscriptionResponse = await api.get('/subscription/status');
      setDashboardData({
        ...dashboardResponse.data,
        subscription: subscriptionResponse.data
      } || {});
    } catch (error) {
      setDashboardData({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const d = dashboardData || {};
    const isBooking = d.category === 'booking';
    const s = d.summary || {};
    
    return [
      { id: 1, title: 'Total Customers', value: d.totalCustomers || 0, icon: FiUsers, color: 'blue' },
      { id: 2, title: isBooking ? 'Total Appointments' : 'Total Orders', value: (isBooking ? d.totalAppointments : d.totalOrders) || 0, icon: isBooking ? FiCalendar : FiShoppingCart, color: 'blue' },
      { id: 3, title: 'Conversion Rate', value: `${isBooking ? (s.conversionRate || 0) : (d.conversionRate || 0)}%`, icon: FiTrendingUp, color: 'emerald' },
      { id: 4, title: isBooking ? 'Cancellation Rate' : 'Total Messages', value: isBooking ? `${s.cancelRate || 0}%` : (d.totalMessages || 0), icon: isBooking ? FiActivity : FiMessageCircle, color: isBooking ? 'rose' : 'blue' },
    ];
  }, [dashboardData]);

  const salesData = [
    { name: 'Jan', value: 400 }, { name: 'Feb', value: 300 }, { name: 'Mar', value: 600 },
    { name: 'Apr', value: 800 }, { name: 'May', value: 500 }, { name: 'Jun', value: 900 }, { name: 'Jul', value: 1100 },
  ];

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-none uppercase italic">Business Center</h1>
          <p className="mt-2 text-slate-500 font-medium">View your overall performance and customer activity here.</p>
        </div>
        {!loading && dashboardData?.subscription && (
           <div 
            onClick={() => window.location.assign('/pricing')}
            className="group flex items-center gap-6 bg-white pl-8 pr-10 py-5 rounded-[2rem] border border-slate-200/60 shadow-sm cursor-pointer hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300"
           >
              <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                <FiCreditCard className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Active Plan</span>
                <span className="text-sm font-black text-slate-900 uppercase italic leading-none">{dashboardData.subscription.plan}</span>
              </div>
              <div className="h-10 w-px bg-slate-100 hidden sm:block" />
              <div className="hidden sm:flex flex-col min-w-[120px]">
                 <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Usage</span>
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
                      {dashboardData.subscription.usage.messagesUsed} / {dashboardData.subscription.limits.maxMessages === Infinity ? '∞' : dashboardData.subscription.limits.maxMessages}
                    </span>
                 </div>
                 <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, (dashboardData.subscription.usage.messagesUsed / (dashboardData.subscription.limits.maxMessages || 1)) * 100)}%` }}
                    />
                 </div>
              </div>
           </div>
        )}
      </header>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <motion.div 
            key={s.id} 
            whileHover={{ y: -5 }}
            className="relative group bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500"
          >
            <div className="flex items-center justify-between mb-8">
               <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 transition-transform group-hover:scale-110 shadow-sm">
                 <s.icon className="h-7 w-7" />
               </div>
               <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100/50">Real-time</span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{s.title}</p>
            <h3 className="text-4xl font-black text-slate-900 mt-2 tracking-tighter">{loading ? '...' : s.value}</h3>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-10 lg:grid-cols-2">
        <div className="bg-white p-10 rounded-[3rem] border border-slate-200/60 shadow-sm relative overflow-hidden group">
          <header className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                {dashboardData?.category === 'booking' ? 'Booking Trends' : 'Messaging Activity'}
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                {dashboardData?.category === 'booking' ? 'Upcoming Bookings (Next 7 Days)' : 'Daily Message Count'}
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm">
              <FiActivity className="h-6 w-6" />
            </div>
          </header>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {dashboardData?.category === 'booking' ? (
                <BarChart data={dashboardData?.appointmentTrend || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="_id" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                    tickFormatter={(str) => {
                      const d = new Date(str);
                      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                    }}
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px' }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    iconType="circle"
                    wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: '20px' }}
                  />
                  <Bar dataKey="confirmed" fill="#10b981" radius={[10, 10, 0, 0]} barSize={20} />
                  <Bar dataKey="cancelled" fill="#ef4444" radius={[10, 10, 0, 0]} barSize={20} />
                </BarChart>
              ) : (
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorBlue)" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] border border-slate-200/60 shadow-sm relative overflow-hidden flex flex-col">
          <header className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">System Status</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Live Server Check</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm">
              <FiCheckCircle className="h-6 w-6" />
            </div>
          </header>
          <div className="space-y-6 flex-1 flex flex-col justify-center">
             <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-between group hover:bg-white transition-all cursor-default">
                <div className="flex items-center gap-5">
                   <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/10" />
                   <div>
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Main Server</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Live Connection</p>
                   </div>
                </div>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 uppercase tracking-widest group-hover:bg-emerald-600 group-hover:text-white transition-all">Active</span>
             </div>
             <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-between group hover:bg-white transition-all cursor-default">
                <div className="flex items-center gap-5">
                   <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/10" />
                   <div>
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Chat Engine</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Automated Replies</p>
                   </div>
                </div>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 uppercase tracking-widest group-hover:bg-emerald-600 group-hover:text-white transition-all">Active</span>
             </div>
             <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-between group hover:bg-white transition-all cursor-default">
                <div className="flex items-center gap-5">
                   <div className="h-3 w-3 rounded-full bg-blue-600 animate-pulse ring-4 ring-blue-600/10" />
                   <div>
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Media Storage</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Images & Files</p>
                   </div>
                </div>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 uppercase tracking-widest group-hover:bg-blue-600 group-hover:text-white transition-all">Processing</span>
             </div>
          </div>
        </div>
      </section>

      <section className="grid gap-10 lg:grid-cols-2">
        <div className="bg-white p-10 rounded-[3rem] border border-slate-200/60 shadow-sm flex flex-col">
          <header className="flex items-center justify-between mb-8">
             <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Recent Transmissions</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Live Communication Feed</p>
             </div>
             <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/10">
                <FiMessageCircle className="h-5 w-5" />
             </div>
          </header>
          <div className="space-y-4 flex-1">
            {(dashboardData?.recentChats || []).slice(0, 5).map((chat) => (
              <div key={chat._id} className="flex items-center gap-5 p-5 rounded-[1.8rem] border border-slate-50 bg-white hover:border-slate-200 hover:bg-slate-50 transition-all duration-300 cursor-pointer group">
                <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-sm font-black shadow-xl shadow-blue-500/10 transition-transform group-hover:scale-110">
                  {getCustomerName(chat.customerId)[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">{getCustomerName(chat.customerId)}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatDateTime(chat.createdAt)}</p>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-1.5 font-medium leading-none">{chat.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] border border-slate-200/60 shadow-sm flex flex-col overflow-hidden">
          <header className="flex items-center justify-between mb-10">
             <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Identity Records</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  {dashboardData?.category === 'booking' ? 'Latest Appointment Registry' : 'Latest Order Registry'}
                </p>
             </div>
             <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shadow-sm">
                <FiBox className="h-5 w-5" />
             </div>
          </header>
          <div className="flex-1">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
                  <th className="text-left pb-5">Node Identification</th>
                  <th className="text-left pb-5">Stakeholder</th>
                  <th className="text-right pb-5">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(dashboardData?.category === 'booking' ? dashboardData?.recentBookings : dashboardData?.recentOrders || []).slice(0, 5).map((item) => (
                  <tr key={item._id} className="group hover:bg-slate-50 transition-colors duration-300">
                    <td className="py-6">
                       <p className="text-sm font-black text-slate-900 tracking-tighter bg-slate-100 w-fit px-3 py-1 rounded-lg"># { (item.orderId || item._id).toString().slice(-6).toUpperCase() }</p>
                    </td>
                    <td className="py-6">
                       <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{getCustomerName(item.customerId)}</p>
                    </td>
                    <td className="py-6 text-right">
                      <Badge variant={getStatusClass(getOrderStatus(item))}>{getOrderStatus(item)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
