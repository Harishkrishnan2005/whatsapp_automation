import { useEffect, useMemo, useState } from 'react';
import { FiBox, FiCheckCircle, FiMessageCircle, FiShoppingCart, FiUsers, FiTrendingUp, FiActivity } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
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
      const response = await api.get('/dashboard/admin');
      setDashboardData(response.data || {});
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
    return [
      { id: 1, title: 'Total Customers', value: d.totalCustomers || 0, icon: FiUsers, color: 'blue' },
      { id: 2, title: 'Active Orders', value: d.totalOrders || 0, icon: FiShoppingCart, color: 'blue' },
      { id: 3, title: 'Conv. Rate', value: `${d.conversionRate || 0}%`, icon: FiTrendingUp, color: 'blue' },
      { id: 4, title: 'Network Load', value: d.totalMessages || 0, icon: FiActivity, color: 'blue' },
    ];
  }, [dashboardData]);

  const salesData = [
    { name: 'Jan', value: 400 }, { name: 'Feb', value: 300 }, { name: 'Mar', value: 600 },
    { name: 'Apr', value: 800 }, { name: 'May', value: 500 }, { name: 'Jun', value: 900 }, { name: 'Jul', value: 1100 },
  ];

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-none">System Performance</h1>
        <p className="mt-2 text-slate-500 font-medium">Monitoring multi-tenant infrastructure and customer engagement matrix.</p>
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
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Traffic Distribution</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Network Capacity Log</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm">
              <FiActivity className="h-6 w-6" />
            </div>
          </header>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
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
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] border border-slate-200/60 shadow-sm relative overflow-hidden flex flex-col">
          <header className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Operational Health</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">System Uptime Matrix</p>
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
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Main Gateway</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Cloud Node 01</p>
                   </div>
                </div>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 uppercase tracking-widest group-hover:bg-emerald-600 group-hover:text-white transition-all">Operational</span>
             </div>
             <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-between group hover:bg-white transition-all cursor-default">
                <div className="flex items-center gap-5">
                   <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/10" />
                   <div>
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Neural Chat Engine</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Auto-Response Hive</p>
                   </div>
                </div>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 uppercase tracking-widest group-hover:bg-emerald-600 group-hover:text-white transition-all">Operational</span>
             </div>
             <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-between group hover:bg-white transition-all cursor-default">
                <div className="flex items-center gap-5">
                   <div className="h-3 w-3 rounded-full bg-blue-600 animate-pulse ring-4 ring-blue-600/10" />
                   <div>
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight">AI Diffusion Hosting</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Resource Allocation</p>
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
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Latest Order Registry</p>
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
                {(dashboardData?.recentOrders || []).slice(0, 5).map((order) => (
                  <tr key={order._id} className="group hover:bg-slate-50 transition-colors duration-300">
                    <td className="py-6">
                       <p className="text-sm font-black text-slate-900 tracking-tighter bg-slate-100 w-fit px-3 py-1 rounded-lg"># { (order.orderId || order._id).toString().slice(-6).toUpperCase() }</p>
                    </td>
                    <td className="py-6">
                       <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{getCustomerName(order.customerId)}</p>
                    </td>
                    <td className="py-6 text-right">
                      <Badge variant={getStatusClass(getOrderStatus(order))}>{getOrderStatus(order)}</Badge>
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
