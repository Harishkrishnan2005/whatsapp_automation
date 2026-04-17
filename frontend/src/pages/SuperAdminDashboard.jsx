import { useEffect, useState } from 'react';
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
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Global Infrastructure Hub</h1>
          <p className="mt-2 text-slate-500 font-medium">Monitoring cross-tenant operational throughput and subscription liquidity.</p>
        </div>
        <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200/60 shadow-sm">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Network Health</p>
           <p className="text-sm font-bold text-emerald-600 mt-1 uppercase">99.98% Operational Yield</p>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {[
          { label: 'Registered Entities', value: stats.totalBusinesses, sub: 'Managed Businesses', color: 'blue' },
          { label: 'Network Ingress', value: stats.totalCustomers, sub: 'Consolidated Clients', color: 'indigo' },
          { label: 'Process Resolution', value: stats.totalOrders, sub: 'Total Ledger Entries', color: 'slate' },
        ].map((m, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm relative overflow-hidden group hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
             <div className="relative z-10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.label}</p>
                <p className={`mt-4 text-4xl font-black text-slate-900 tracking-tighter`}>{m.value}</p>
                <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-tight">{m.sub}</p>
             </div>
             <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className={`h-2 w-2 rounded-full bg-${m.color}-500`} />
             </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white p-10 rounded-[3rem] border border-slate-200/60 shadow-sm flex items-center justify-between">
           <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Oversight</p>
              <h3 className="text-xl font-black text-slate-900 uppercase">System Administrators</h3>
           </div>
           <p className="text-5xl font-black text-blue-600 tracking-tighter">{stats.totalAdmins}</p>
        </div>
        <div className="bg-white p-10 rounded-[3rem] border border-slate-200/60 shadow-sm flex items-center justify-between">
           <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auxiliary Nodes</p>
              <h3 className="text-xl font-black text-slate-900 uppercase">Registered Staff</h3>
           </div>
           <p className="text-5xl font-black text-slate-900 tracking-tighter">{stats.totalStaff}</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-24 bg-blue-500/10 blur-[100px] rounded-full" />
        <div className="relative z-10">
           <h2 className="text-xl font-black uppercase tracking-tight mb-10">Subscription Distribution</h2>
           <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
             {stats.subscriptions.map((plan) => (
               <div key={plan._id} className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-md group hover:bg-white/10 transition-all">
                 <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-4">{plan._id}</p>
                 <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-black text-white">{plan.count}</p>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Licenses</span>
                 </div>
               </div>
             ))}
             {stats.subscriptions.length === 0 && (
               <div className="p-8 border border-white/5 bg-white/5 rounded-[2rem] text-center italic text-slate-600 font-bold uppercase tracking-widest text-[10px]">No active subscription metrics detected</div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
