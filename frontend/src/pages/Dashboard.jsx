import { useEffect, useMemo, useState } from 'react';
import { FiBox, FiCheckCircle, FiMessageCircle, FiShoppingCart, FiUsers } from 'react-icons/fi';
import api from '../utils/api';

const formatDateTime = (value) => {
  if (!value) return '-';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '-';
  return dt.toLocaleString();
};

const getCustomerName = (customer) => customer?.name || customer?.phone || 'Unknown Customer';

const getOrderStatus = (order) => order?.orderStatus || order?.status || 'Pending';
const getStatusClass = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('deliver')) return 'delivered';
  if (normalized.includes('confirm')) return 'processed';
  if (normalized.includes('cancel')) return 'cancelled';
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
      console.error('Error fetching dashboard data:', error);
      setDashboardData({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const intervalId = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const metrics = useMemo(() => {
    const totalCustomers = Number(dashboardData?.totalCustomers || 0);
    const totalOrders = Number(dashboardData?.totalOrders || 0);
    const deliveredOrders = Number(dashboardData?.orderDetails?.deliveredOrders || 0);
    return { totalCustomers, totalOrders, deliveredOrders };
  }, [dashboardData]);

  const recentChats = useMemo(() => (dashboardData?.recentChats || []).slice(0, 5), [dashboardData]);
  const recentOrders = useMemo(() => (dashboardData?.recentOrders || []).slice(0, 5), [dashboardData]);

  const statCards = [
    {
      id: 'customers',
      title: 'Total Customers',
      value: metrics.totalCustomers,
      icon: FiUsers,
      accentClass: 'text-indigo-600 bg-indigo-100',
    },
    {
      id: 'orders',
      title: 'Total Orders',
      value: metrics.totalOrders,
      icon: FiShoppingCart,
      accentClass: 'text-blue-600 bg-blue-100',
    },
    {
      id: 'delivered',
      title: 'Delivered Orders',
      value: metrics.deliveredOrders,
      icon: FiCheckCircle,
      accentClass: 'text-emerald-600 bg-emerald-100',
    },
  ];

  return (
    <div className="min-h-screen bg-app-page px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex max-w-[1700px] flex-col gap-6">
        <section className="surface-card rounded-[2rem] border border-surface p-6 shadow-soft">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">Admin Dashboard</p>
          <h1 className="mt-3 text-3xl font-semibold text-primary">Business Overview</h1>
          <p className="mt-2 text-sm text-secondary">Live snapshot of customers, orders, and latest activity.</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.id} className="surface-card rounded-[1.5rem] border border-surface p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-secondary">{card.title}</p>
                    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${card.accentClass}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-semibold text-primary">{loading ? '...' : card.value.toLocaleString()}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="surface-card rounded-[2rem] border border-surface p-6 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiMessageCircle className="h-5 w-5 text-accent" />
                <h2 className="text-xl font-semibold text-primary">Recent Chat Conversations</h2>
              </div>
              <span className="text-xs font-medium text-secondary">Top 5</span>
            </div>

            {recentChats.length === 0 ? (
              <p className="rounded-xl border border-surface bg-surface-muted p-4 text-sm text-secondary">No recent chat conversations.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-surface">
                <table className="w-full table-auto text-left text-sm">
                  <thead className="bg-surface-muted text-secondary">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Customer</th>
                      <th className="px-4 py-3 font-semibold">Message</th>
                      <th className="px-4 py-3 font-semibold">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentChats.map((chat) => (
                      <tr key={chat._id} className="border-t border-surface">
                        <td className="px-4 py-3 text-primary">{getCustomerName(chat.customerId)}</td>
                        <td className="max-w-[320px] truncate px-4 py-3 text-secondary">{chat.message || '-'}</td>
                        <td className="px-4 py-3 text-secondary">{formatDateTime(chat.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="surface-card rounded-[2rem] border border-surface p-6 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiBox className="h-5 w-5 text-accent" />
                <h2 className="text-xl font-semibold text-primary">Recent Orders</h2>
              </div>
              <span className="text-xs font-medium text-secondary">Top 5</span>
            </div>

            {recentOrders.length === 0 ? (
              <p className="rounded-xl border border-surface bg-surface-muted p-4 text-sm text-secondary">No recent orders.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-surface">
                <table className="w-full table-auto text-left text-sm">
                  <thead className="bg-surface-muted text-secondary">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Order ID</th>
                      <th className="px-4 py-3 font-semibold">Customer</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order._id} className="border-t border-surface">
                        <td className="px-4 py-3 text-primary">{order.orderId || order._id}</td>
                        <td className="px-4 py-3 text-secondary">{getCustomerName(order.customerId)}</td>
                        <td className="px-4 py-3">
                          <span className={`status-pill ${getStatusClass(getOrderStatus(order))}`}>
                            {getOrderStatus(order)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-secondary">{formatDateTime(order.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
