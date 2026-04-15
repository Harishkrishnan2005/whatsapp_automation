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
    const interval = setInterval(fetchDashboardAnalytics, 30000);
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
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, Icon, colorClass, trend }) => (
    <div className={`relative overflow-hidden rounded-2xl border border-white/20 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-white/40 hover:shadow-2xl ${colorClass}`}>
      <div className="absolute inset-0 bg-gradient-to-br opacity-[0.03]" />
      <div className="relative p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-white/70">{title}</p>
            <p className="mt-2 text-3xl font-bold text-white">{value}</p>
            {subtitle && <p className="mt-2 text-xs text-white/60">{subtitle}</p>}
            {trend && (
              <div className="mt-2 flex items-center">
                {trend > 0 ? (
                  <FiArrowUpRight className="mr-1 h-4 w-4 text-green-400" />
                ) : (
                  <FiArrowDownRight className="mr-1 h-4 w-4 text-red-400" />
                )}
                <span className={`text-xs font-semibold ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {Math.abs(trend)}%
                </span>
              </div>
            )}
          </div>
          {Icon && <Icon className="h-8 w-8 opacity-60" />}
        </div>
      </div>
    </div>
  );

  const MetricGroup = ({ title, metrics }) => (
    <div className="relative overflow-hidden rounded-2xl border border-white/20 shadow-xl backdrop-blur-md">
      <div className="absolute inset-0 bg-gradient-to-br opacity-[0.03]" />
      <div className="relative p-6">
        <h3 className="mb-4 font-semibold text-white">{title}</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {metrics.map((metric, idx) => (
            <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20">
              <p className="text-xs text-white/60">{metric.label}</p>
              <p className="mt-1 text-2xl font-bold text-white">{metric.value}</p>
              {metric.unit && <p className="mt-1 text-xs text-white/50">{metric.unit}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-blue-400" />
          <p className="text-white/70">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="text-center">
          <p className="mb-4 text-red-400">{error}</p>
          <button
            onClick={fetchDashboardAnalytics}
            className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const orderData = [
    { name: 'Success', value: analytics.orders.success, color: '#10b981' },
    { name: 'Failed', value: analytics.orders.failed, color: '#ef4444' },
  ];

  const chartData = [
    { name: 'Messages', value: analytics.messages.total },
    { name: 'Orders', value: analytics.orders.total },
    { name: 'Appointments', value: analytics.appointments.total },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold text-white">Analytics Dashboard</h1>
        <p className="text-white/60">Real-time business insights and performance metrics</p>
      </div>

      <div className="mb-6 flex justify-end">
        <button
          onClick={fetchDashboardAnalytics}
          disabled={loading}
          className="rounded-lg border border-blue-400/30 bg-blue-600/20 px-4 py-2 text-sm font-medium text-blue-300 transition-all hover:bg-blue-600/30 disabled:opacity-50"
        >
          <span className="inline-flex items-center gap-2">
            <FiRefreshCw className="h-4 w-4" />
            Refresh
          </span>
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Customers"
          value={analytics.customers.total}
          subtitle={`${analytics.customers.new} new, ${analytics.customers.existing} existing`}
          Icon={FiUsers}
          colorClass="bg-gradient-to-br from-blue-600/20 to-blue-400/10"
          trend={5}
        />
        <StatCard
          title="Total Revenue"
          value={`Rs ${(analytics.revenue.total).toLocaleString()}`}
          subtitle={`Avg: Rs ${(analytics.revenue.averageOrderValue).toLocaleString()}/order`}
          Icon={FiDollarSign}
          colorClass="bg-gradient-to-br from-green-600/20 to-green-400/10"
          trend={8}
        />
        <StatCard
          title="Total Orders"
          value={analytics.orders.total}
          subtitle={`Success: ${analytics.orders.successRate}% | Failed: ${analytics.orders.failureRate}%`}
          Icon={FiPackage}
          colorClass="bg-gradient-to-br from-purple-600/20 to-purple-400/10"
          trend={3}
        />
        <StatCard
          title="Total Messages"
          value={analytics.messages.total}
          subtitle={`In ${analytics.messages.incoming} | Out ${analytics.messages.outgoing}`}
          Icon={FiMessageCircle}
          colorClass="bg-gradient-to-br from-orange-600/20 to-orange-400/10"
          trend={12}
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Appointments"
          value={analytics.appointments.total}
          subtitle={`Confirmed: ${analytics.appointments.confirmed}`}
          Icon={FiCalendar}
          colorClass="bg-gradient-to-br from-pink-600/20 to-pink-400/10"
          trend={2}
        />
        <StatCard
          title="Staff Assigned Chats"
          value={analytics.staffChat.total}
          subtitle={`In Progress: ${analytics.staffChat.inProgress}`}
          Icon={FiBriefcase}
          colorClass="bg-gradient-to-br from-cyan-600/20 to-cyan-400/10"
          trend={6}
        />
        <StatCard
          title="Conversion Rate"
          value={`${analytics.customers.conversionRate}%`}
          subtitle="Customer retention rate"
          Icon={FiTrendingUp}
          colorClass="bg-gradient-to-br from-green-600/20 to-green-400/10"
          trend={4}
        />
        <StatCard
          title="Total Campaigns"
          value={analytics.campaigns.total}
          subtitle={`All: ${analytics.campaigns.allCustomers} | Existing: ${analytics.campaigns.existingCustomers}`}
          Icon={FiSend}
          colorClass="bg-gradient-to-br from-indigo-600/20 to-indigo-400/10"
          trend={10}
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MetricGroup
          title="Order Performance"
          metrics={[
            { label: 'Total Orders', value: analytics.orders.total },
            { label: 'Successful', value: analytics.orders.success },
            { label: 'Failed', value: analytics.orders.failed },
            { label: 'Success Rate', value: `${analytics.orders.successRate}%` },
            { label: 'Failure Rate', value: `${analytics.orders.failureRate}%` },
          ]}
        />

        <MetricGroup
          title="Message Analytics"
          metrics={[
            { label: 'Total Messages', value: analytics.messages.total },
            { label: 'Incoming', value: analytics.messages.incoming },
            { label: 'Outgoing', value: analytics.messages.outgoing },
            { label: 'Incoming %', value: `${((analytics.messages.incoming / analytics.messages.total) * 100 || 0).toFixed(1)}%` },
            { label: 'Outgoing %', value: `${((analytics.messages.outgoing / analytics.messages.total) * 100 || 0).toFixed(1)}%` },
          ]}
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MetricGroup
          title="Appointment Details"
          metrics={[
            { label: 'Total Appointments', value: analytics.appointments.total },
            { label: 'Pending', value: analytics.appointments.pending },
            { label: 'Confirmed', value: analytics.appointments.confirmed },
            { label: 'Staff Assigned', value: analytics.appointments.staffAssigned },
          ]}
        />

        <MetricGroup
          title="Staff Chat Management"
          metrics={[
            { label: 'Total Chats', value: analytics.staffChat.total },
            { label: 'Assigned', value: analytics.staffChat.assigned },
            { label: 'In Progress', value: analytics.staffChat.inProgress },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/20 p-6 shadow-xl backdrop-blur-md">
          <h3 className="mb-6 font-semibold text-white">Order Conversion Rate</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={orderData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {orderData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} orders`, 'Count']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-white/20 p-6 shadow-xl backdrop-blur-md">
          <h3 className="mb-6 font-semibold text-white">Activity Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.6)" />
              <YAxis stroke="rgba(255,255,255,0.6)" />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)' }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-white/20 p-6 shadow-xl backdrop-blur-md">
        <h3 className="mb-4 font-semibold text-white">Summary</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white/60">Customer Base</p>
            <p className="mt-2 text-2xl font-bold text-white">{analytics.customers.total}</p>
            <p className="mt-2 text-xs text-white/50">
              {((analytics.customers.existing / analytics.customers.total) * 100).toFixed(1)}% retention
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white/60">Revenue Generated</p>
            <p className="mt-2 text-2xl font-bold text-white">Rs {(analytics.revenue.total).toLocaleString()}</p>
            <p className="mt-2 text-xs text-white/50">from {analytics.orders.total} orders</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white/60">Engagement Rate</p>
            <p className="mt-2 text-2xl font-bold text-white">{((analytics.messages.total / analytics.customers.total) * 100).toFixed(1)}%</p>
            <p className="mt-2 text-xs text-white/50">{analytics.messages.total} total messages</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
