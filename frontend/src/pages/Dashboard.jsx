import { useEffect, useMemo, useState } from 'react';
import { 
  FiBox, 
  FiCheckCircle, 
  FiMessageCircle, 
  FiShoppingCart, 
  FiUsers, 
  FiTrendingUp, 
  FiActivity, 
  FiCreditCard, 
  FiCalendar,
  FiArrowUpRight,
  FiArrowDownRight,
  FiZap,
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import api from '../utils/api';

const formatDateTime = (value) => {
  if (!value) return '-';
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getCustomerName = (customer) => customer?.name || customer?.phone || 'Anonymous';
const getOrderStatus = (order) => order?.orderStatus || order?.status || 'Pending';
const getStatusClass = (status) => {
  const norm = String(status || '').toLowerCase();
  if (norm.includes('deliver') || norm.includes('paid') || norm.includes('complete')) return 'success';
  if (norm.includes('confirm') || norm.includes('process')) return 'processing';
  if (norm.includes('cancel') || norm.includes('fail')) return 'error';
  return 'pending';
};

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [dbRes, subRes] = await Promise.all([
        api.get('/dashboard/admin'),
        api.get('/subscription/status')
      ]);
      setDashboardData({ ...dbRes.data, subscription: subRes.data });
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      setDashboardData({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const d = dashboardData || {};
    const isBooking = d.category === 'booking';
    
    return [
      { 
        title: 'Active Users', 
        value: d.totalCustomers || 0, 
        icon: FiUsers, 
        trend: '+12%', 
        up: true,
        subtitle: 'Unique identifiers'
      },
      { 
        title: isBooking ? 'Bookings' : 'Orders', 
        value: (isBooking ? d.totalAppointments : d.totalOrders) || 0, 
        icon: isBooking ? FiCalendar : FiBox, 
        trend: '+8.4%', 
        up: true,
        subtitle: 'Last 30 days'
      },
      { 
        title: 'Conversations', 
        value: d.totalMessages || 0, 
        icon: FiMessageCircle, 
        trend: '+24%', 
        up: true,
        subtitle: 'Today\'s volume'
      },
      { 
        title: 'Conversion', 
        value: `${(isBooking ? d.summary?.conversionRate : d.conversionRate) || 0}%`, 
        icon: FiZap, 
        trend: '-2.1%', 
        up: false,
        subtitle: 'Visitor to order'
      },
    ];
  }, [dashboardData]);

  const chartData = useMemo(() => {
    return dashboardData?.engagementTrend || [
      { name: 'Mon', value: 0 }, { name: 'Tue', value: 0 }, { name: 'Wed', value: 0 },
      { name: 'Thu', value: 0 }, { name: 'Fri', value: 0 }, { name: 'Sat', value: 0 }, { name: 'Sun', value: 0 },
    ];
  }, [dashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Performance Overview</h1>
          <p className="text-sm text-slate-500 font-bold mt-1">Real-time infrastructure monitoring</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live System Status</span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <Card key={idx} className="!p-0 border-none shadow-xl shadow-slate-200/40">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${stat.up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {stat.up ? <FiArrowUpRight /> : <FiArrowDownRight />}
                  {stat.trend}
                </div>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                {stat.title}
              </p>
              <div className="flex items-baseline gap-2 mt-2">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{stat.subtitle}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Area Chart */}
        <Card title="Traffic Matrix" subtitle="Weekly engagement metrics" className="lg:col-span-2">
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '10px' }}
                />
                <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#chartGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Subscription Info / Usage */}
        <Card title="Subscription" subtitle="Resource allocation" className="flex flex-col">
          {dashboardData?.subscription && (
            <div className="space-y-6 mt-4 flex-1 flex flex-col justify-center">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Message Quota</span>
                  <span className="text-xs font-black text-slate-900">
                    {dashboardData.subscription.usage.messagesUsed} / {dashboardData.subscription.limits.maxMessages === Infinity ? '∞' : dashboardData.subscription.limits.maxMessages}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, (dashboardData.subscription.usage.messagesUsed / (dashboardData.subscription.limits.maxMessages || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm">
                    <FiCreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Plan Level</p>
                    <p className="text-sm font-black text-slate-900 mt-1">{dashboardData.subscription.plan} Edition</p>
                  </div>
                </div>
                <button 
                  onClick={() => window.location.assign('/pricing')}
                  className="w-full py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                >
                  Upgrade Hub
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Bottom Section: Recent activity and tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Chats */}
        <Card title="Transmissions" subtitle="Live communication feed" icon={FiMessageCircle}>
          <div className="space-y-3 mt-4">
            {(dashboardData?.recentChats || []).slice(0, 5).map((chat) => (
              <div key={chat._id} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-50 bg-white hover:border-slate-200 hover:bg-slate-50 transition-all cursor-pointer group">
                <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-lg shadow-blue-600/10 transition-transform group-hover:scale-105">
                  {getCustomerName(chat.customerId)[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-slate-900 uppercase truncate">{getCustomerName(chat.customerId)}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{formatDateTime(chat.createdAt)}</p>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-1 font-medium">{chat.message}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Orders/Bookings */}
        <Card 
          title={dashboardData?.category === 'booking' ? 'Appointments' : 'Transactions'} 
          subtitle="Latest identity records"
          icon={dashboardData?.category === 'booking' ? FiCalendar : FiShoppingCart}
        >
          <div className="overflow-x-auto mt-4">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <th className="text-left pb-4">ID</th>
                  <th className="text-left pb-4">Stakeholder</th>
                  <th className="text-right pb-4">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(dashboardData?.category === 'booking' ? dashboardData?.recentBookings : dashboardData?.recentOrders || []).slice(0, 5).map((item) => (
                  <tr key={item._id} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-4">
                      <span className="text-[10px] font-black text-slate-900 bg-slate-50 px-2 py-1 rounded-lg">
                        #{String(item.orderId || item._id).slice(-6).toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4">
                      <p className="text-xs font-bold text-slate-600 truncate max-w-[120px]">{getCustomerName(item.customerId)}</p>
                    </td>
                    <td className="py-4 text-right">
                      <Badge variant={getStatusClass(getOrderStatus(item))} size="sm">
                        {getOrderStatus(item)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
