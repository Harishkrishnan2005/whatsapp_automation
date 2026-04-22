import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FiTrendingUp, FiActivity, FiGlobe, FiDatabase } from 'react-icons/fi';
import api from '../utils/api';

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/superadmin/dashboard');
        setStats(response.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Unable to load dashboard matrix');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
         <div className="h-12 w-12 border-[3px] border-slate-100 border-t-blue-600 rounded-full animate-spin" />
         <p className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hydrating Platform Ledger...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-100 p-10 rounded-[2.5rem] flex items-center gap-6">
         <div className="h-12 w-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-black">!</div>
         <div>
            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Operational Error</p>
            <p className="text-sm font-bold text-rose-600 uppercase mt-1">{error}</p>
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none uppercase italic">Global Infrastructure Hub</h1>
          <p className="mt-2 text-slate-500 font-medium">Monitoring cross-tenant operational throughput and subscription liquidity.</p>
        </div>
        <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
           <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Network Health</p>
              <p className="text-sm font-bold text-emerald-600 mt-1 uppercase">Operational Yield: 99.9%</p>
           </div>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Registered Entities', value: stats.totalBusinesses, sub: 'Managed Businesses', color: 'blue', icon: FiGlobe },
          { 
            label: 'Subscription Yield', 
            value: `₹${(stats.subRevenue || 0).toLocaleString()}`, 
            sub: 'Overall Amount',
            color: 'emerald', 
            icon: FiTrendingUp 
          },
          { label: 'Platform MRR', value: stats.mrr ? `₹${stats.mrr.toLocaleString()}` : '₹0', sub: 'Monthly Recurring', color: 'blue', icon: FiActivity },
          { label: 'Network Ingress', value: stats.totalCustomers, sub: 'Consolidated Clients', color: 'indigo', icon: FiDatabase },
        ].map((m, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm relative overflow-hidden group hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-300">
             <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.label}</p>
                   <m.icon className={`h-5 w-5 text-${m.color}-500 opacity-50`} />
                </div>
                <p className={`text-4xl font-black text-slate-900 tracking-tighter`}>{m.value}</p>
                <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-tight">{m.sub}</p>
             </div>
             <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className={`h-2 w-2 rounded-full bg-${m.color}-500`} />
             </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-12 rounded-[3.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
        <header className="flex items-center justify-between mb-12">
           <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Financial Trajectory</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">SaaS Revenue trend over time</p>
           </div>
           <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-blue-600">₹{stats.totalRevenue?.toLocaleString()}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Secured</span>
           </div>
        </header>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.revenueTrend && stats.revenueTrend.length > 0 ? stats.revenueTrend : [
              { name: 'Jan', value: 0 }, { name: 'Feb', value: 0 }, { name: 'Mar', value: 0 },
              { name: 'Apr', value: 0 }, { name: 'May', value: 0 }, { name: 'Jun', value: 0 }
            ]}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} />
              <YAxis hide />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-5 rounded-2xl shadow-2xl border border-slate-100 ring-1 ring-black/5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{label}</p>
                        <div className="space-y-2">
                           <div className="flex items-center justify-between gap-8">
                             <span className="text-[10px] font-bold text-slate-500 uppercase">Revenue</span>
                             <span className="text-sm font-black text-blue-600">₹{payload[0].value.toLocaleString()}</span>
                           </div>
                           <div className="flex items-center justify-between gap-8">
                             <span className="text-[10px] font-bold text-slate-500 uppercase">Subscriptions</span>
                             <span className="text-sm font-black text-slate-900">{payload[0].payload.count || 0} Businesses</span>
                           </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white p-10 rounded-[3rem] border border-slate-200/60 shadow-sm flex items-center justify-between group hover:shadow-xl transition-all">
           <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Oversight</p>
              <h3 className="text-xl font-black text-slate-900 uppercase">System Administrators</h3>
           </div>
           <p className="text-5xl font-black text-blue-600 tracking-tighter group-hover:scale-110 transition-transform">{stats.totalAdmins}</p>
        </div>
        <div className="bg-white p-10 rounded-[3rem] border border-slate-200/60 shadow-sm flex items-center justify-between group hover:shadow-xl transition-all">
           <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auxiliary Nodes</p>
              <h3 className="text-xl font-black text-slate-900 uppercase">Registered Staff</h3>
           </div>
           <p className="text-5xl font-black text-slate-900 tracking-tighter group-hover:scale-110 transition-transform">{stats.totalStaff}</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-[3.5rem] p-16 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-32 bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="relative z-10">
           <h2 className="text-xl font-black uppercase tracking-tight mb-12">Subscription Tier Distribution</h2>
           <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
             {stats.planWiseStats.map((plan) => (
               <div key={plan.plan} className="bg-white/5 border border-white/10 p-10 rounded-[2.5rem] backdrop-blur-md group hover:bg-white/10 transition-all border-b-4 border-b-blue-500/50">
                 <div className="flex justify-between items-start mb-6">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">{plan.plan}</p>
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">₹{plan.revenue?.toLocaleString()}</p>
                 </div>
                 <div className="flex items-baseline gap-3">
                    <p className="text-5xl font-black text-white">{plan.activeBusinesses}</p>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Nodes</span>
                 </div>
               </div>
             ))}
             {stats.planWiseStats.length === 0 && (
               <div className="p-8 border border-white/5 bg-white/5 rounded-[2rem] text-center italic text-slate-600 font-bold uppercase tracking-widest text-[10px]">No active subscription metrics detected</div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
