import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  FiArrowDownRight,
  FiArrowUpRight,
  FiBriefcase,
  FiCalendar,
  FiDollarSign,
  FiMessageCircle,
  FiPackage,
  FiRefreshCw,
  FiSend,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import api from '../utils/api';

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardAnalytics();
    const interval = setInterval(fetchDashboardAnalytics, 120000); // 120s sync
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/analytics/dashboard');
      setAnalytics(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load intelligence data stream');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, Icon, trend, colorClass }) => (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm relative overflow-hidden group hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500">
       <div className="relative z-10 flex flex-col justify-between h-full">
          <div className="flex justify-between items-start">
             <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                {Icon && <Icon className="h-5 w-5" />}
             </div>
             {trend && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                   {trend > 0 ? <FiArrowUpRight /> : <FiArrowDownRight />}
                   {Math.abs(trend)}%
                </div>
             )}
          </div>
          <div className="mt-8">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
             <h3 className="text-3xl font-black text-slate-900 tracking-tighter mt-1">{value}</h3>
             {subtitle && <p className="text-[9px] font-bold text-slate-400 mt-2 line-clamp-1">{subtitle}</p>}
          </div>
       </div>
    </div>
  );

  const MetricGroup = ({ title, metrics }) => (
    <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm p-10 overflow-hidden">
       <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">{title}</h3>
       <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
          {metrics.map((m, idx) => (
             <div key={idx} className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">{m.label}</p>
                <div className="flex items-baseline gap-2">
                   <p className="text-2xl font-black text-slate-900 tracking-tighter">{m.value}</p>
                   {m.unit && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{m.unit}</span>}
                </div>
             </div>
          ))}
       </div>
    </div>
  );

  if (loading && !analytics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
         <div className="h-12 w-12 border-[3px] border-slate-100 border-t-blue-600 rounded-full animate-spin" />
         <p className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Querying Data Matrix...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-rose-50/50 rounded-[3rem] border border-rose-100 p-12">
         <p className="text-rose-600 font-extrabold uppercase tracking-widest text-xs mb-6">{error}</p>
         <button onClick={fetchDashboardAnalytics} className="btn-primary px-8 py-3 text-[10px]">Restablish Sync</button>
      </div>
    );
  }

  if (!analytics) return null;

  const orderData = [
    { name: 'Success', value: analytics.orders.success, color: '#2563eb' },
    { name: 'Resolution Failed', value: analytics.orders.failed, color: '#cbd5e1' },
  ];

  const chartData = [
    { name: 'Traffic', value: analytics.messages.total },
    { name: 'Ledger', value: analytics.orders.total },
    { name: 'Nodes', value: analytics.appointments.total },
  ];

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Intelligence Hub</h1>
          <p className="mt-2 text-slate-500 font-medium">Enterprise performance synchronization and business logic visualization.</p>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={fetchDashboardAnalytics} disabled={loading} className="btn-secondary h-12 px-6 flex items-center gap-2 group">
              <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              <span className="text-[10px] uppercase font-black">Sync Ledger</span>
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Consolidated Client Base"
          value={analytics.customers.total}
          subtitle={`${analytics.customers.new} New Nodes / ${analytics.customers.existing} Active`}
          Icon={FiUsers}
          trend={5}
        />
        <StatCard
          title="Aggregated Liquidity"
          value={`Rs ${(analytics.revenue.total).toLocaleString()}`}
          subtitle={`AOV Projection: Rs ${(analytics.revenue.averageOrderValue).toFixed(0)}`}
          Icon={FiDollarSign}
          trend={8}
        />
        <StatCard
          title="Transaction Throughput"
          value={analytics.orders.total}
          subtitle={`${analytics.orders.successRate}% Conversion Resolution`}
          Icon={FiPackage}
          trend={3}
        />
        <StatCard
          title="Network Traffic (MSG)"
          value={analytics.messages.total}
          subtitle={`I/O: ${analytics.messages.incoming} IN / ${analytics.messages.outgoing} OUT`}
          Icon={FiMessageCircle}
          trend={12}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <MetricGroup
          title="Transaction Resolutions"
          metrics={[
            { label: 'Total Units', value: analytics.orders.total },
            { label: 'Cleared', value: analytics.orders.success },
            { label: 'Latent', value: analytics.orders.failed },
            { label: 'Success Yield', value: `${analytics.orders.successRate}%` },
            { label: 'Error Ratio', value: `${analytics.orders.failureRate}%` },
          ]}
        />
        <MetricGroup
          title="Network Utilization"
          metrics={[
            { label: 'Total Traffic', value: analytics.messages.total },
            { label: 'Ingress', value: analytics.messages.incoming },
            { label: 'Egress', value: analytics.messages.outgoing },
            { label: 'Ingress Ratio', value: `${((analytics.messages.incoming / analytics.messages.total) * 100 || 0).toFixed(1)}%` },
            { label: 'Egress Ratio', value: `${((analytics.messages.outgoing / analytics.messages.total) * 100 || 0).toFixed(1)}%` },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm p-10 overflow-hidden">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-10 text-center">Conversion Topology</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {orderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '12px' }}
                    itemStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-10 mt-6">
                {orderData.map((d, i) => (
                   <div key={i} className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{d.name}</span>
                   </div>
                ))}
            </div>
         </div>

         <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm p-10 overflow-hidden">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-10 text-center">Activity Spectral Map</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} dy={10} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '12px' }}
                    itemStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  />
                  <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 6, 6]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
         </div>
      </div>

      <div className="bg-slate-900 rounded-[3rem] p-12 text-white overflow-hidden relative">
         <div className="absolute top-0 right-0 p-24 bg-blue-500/10 blur-[100px] rounded-full" />
         <h3 className="text-xl font-bold uppercase tracking-tight mb-8">Executive Summary</h3>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
            <div className="space-y-2">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Ecosystem</p>
               <p className="text-3xl font-black">{analytics.customers.total}</p>
               <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{((analytics.customers.existing / analytics.customers.total) * 100).toFixed(1)}% Core Retention</p>
            </div>
            <div className="space-y-2 border-l border-white/10 pl-12">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resolved Revenue</p>
               <p className="text-3xl font-black">Rs {(analytics.revenue.total).toLocaleString()}</p>
               <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Across {analytics.orders.total} Validations</p>
            </div>
            <div className="space-y-2 border-l border-white/10 pl-12">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interaction Density</p>
               <p className="text-3xl font-black">{((analytics.messages.total / analytics.customers.total) * 100).toFixed(1)}%</p>
               <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{analytics.messages.total} Total Transmissions</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Analytics;

