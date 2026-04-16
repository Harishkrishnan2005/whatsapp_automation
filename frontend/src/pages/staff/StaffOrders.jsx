import { useEffect, useState } from 'react';
import api from '../../utils/api';
import useAnalyticsStore from '../../store/analyticsStore';
import { getDateRangePayload } from '../../utils/dateRange';

const ORDER_STATUSES = ['Pending', 'Confirmed', 'Cancelled', 'Delivered', 'Return Requested', 'Returned'];
const PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed', 'Refunded'];

const StaffOrders = () => {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(false);
  const dateRange = useAnalyticsStore((state) => state.dateRange);
  const searchQuery = useAnalyticsStore((state) => state.searchQuery);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { from, to } = getDateRangePayload(dateRange);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (searchQuery) params.set('search', searchQuery);

      const response = await api.get(`/orders?${params.toString()}`);
      setOrders(response.data.orders || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching assigned orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, dateRange, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [dateRange, searchQuery]);

  const updateStatus = async (id, orderStatus) => {
    try {
      await api.put(`/orders/${id}/status`, { orderStatus });
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const updatePaymentStatus = async (id, paymentStatus) => {
    try {
      await api.put(`/orders/${id}/payment-status`, { paymentStatus });
      fetchOrders();
    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 md:p-8 text-white">
      <div className="mb-8 rounded-2xl border border-white/10 bg-slate-950/30 p-6 shadow-xl backdrop-blur-md">
        <h1 className="text-4xl font-bold text-white">My Orders</h1>
        <p className="mt-2 text-cyan-200">Manage only the orders assigned to you.</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/30 shadow-xl backdrop-blur-md">
        <table className="w-full min-w-[980px]">
          <thead className="border-b border-white/10 bg-slate-950/20">
            <tr>
              <th className="p-4 text-left font-semibold text-cyan-200">Customer</th>
              <th className="p-4 text-left font-semibold text-cyan-200">Product</th>
              <th className="p-4 text-left font-semibold text-cyan-200">Amount</th>
              <th className="p-4 text-left font-semibold text-cyan-200">Order Status</th>
              <th className="p-4 text-left font-semibold text-cyan-200">Payment Status</th>
              <th className="p-4 text-left font-semibold text-cyan-200">Order ID</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const orderStatus = order.orderStatus || order.status || 'Pending';
              const paymentStatus = order.paymentStatus || 'Pending';
              return (
                <tr key={order._id} className="border-b border-white/10">
                  <td className="p-4 text-white">
                    <p className="font-semibold">{order.customerId?.name || '-'}</p>
                    <p className="text-xs text-slate-300">{order.customerId?.phone || '-'}</p>
                  </td>
                  <td className="p-4 text-slate-200">{order.product}</td>
                  <td className="p-4 text-slate-200">Rs {Number(order.amount || 0).toFixed(2)}</td>
                  <td className="p-4">
                    <select
                      value={orderStatus}
                      onChange={(e) => updateStatus(order._id, e.target.value)}
                      className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none"
                    >
                      {ORDER_STATUSES.map((status) => (
                        <option key={status} value={status} className="bg-slate-900">{status}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4">
                    <select
                      value={paymentStatus}
                      onChange={(e) => updatePaymentStatus(order._id, e.target.value)}
                      className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none"
                    >
                      {PAYMENT_STATUSES.map((status) => (
                        <option key={status} value={status} className="bg-slate-900">{status}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4 font-mono text-xs text-slate-200">{order.orderId || order._id}</td>
                </tr>
              );
            })}
            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">No assigned orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page === 1}
          className="rounded-xl border border-white/10 bg-slate-900/40 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page >= totalPages}
          className="rounded-xl border border-blue-400/50 bg-blue-500/80 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default StaffOrders;
