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
        setError(err.response?.data?.message || err.message || 'Unable to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="p-8 text-white">Loading super admin dashboard...</div>;
  }

  if (error) {
    return <div className="p-8 text-white">{error}</div>;
  }

  return (
    <div className="space-y-6 p-8 text-slate-100">
      <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-8 shadow-xl">
        <h1 className="text-3xl font-semibold text-white">Platform Overview</h1>
        <p className="mt-3 text-sm text-slate-400">Global tenant, customer, order, and user metrics for the whole platform.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-xl">
          <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Businesses</p>
          <p className="mt-4 text-4xl font-semibold text-white">{stats.totalBusinesses}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-xl">
          <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Customers</p>
          <p className="mt-4 text-4xl font-semibold text-white">{stats.totalCustomers}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-xl">
          <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Orders</p>
          <p className="mt-4 text-4xl font-semibold text-white">{stats.totalOrders}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-xl">
          <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Admins</p>
          <p className="mt-4 text-4xl font-semibold text-white">{stats.totalAdmins}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-xl">
          <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Staff</p>
          <p className="mt-4 text-4xl font-semibold text-white">{stats.totalStaff}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-xl">
        <h2 className="text-2xl font-semibold text-white">Subscription breakdown</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.subscriptions.map((plan) => (
            <div key={plan._id} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
              <p className="text-sm text-slate-400">{plan._id}</p>
              <p className="mt-3 text-3xl font-semibold text-white">{plan.count}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
