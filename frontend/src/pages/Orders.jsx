import { useEffect, useMemo, useState } from 'react';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import api from '../utils/api';

const ORDER_STATUSES = ['Pending', 'Confirmed', 'Cancelled', 'Delivered', 'Return Requested', 'Returned'];
const PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed', 'Refunded'];
const PAYMENT_TYPES = ['COD', 'ONLINE'];

const normalizePaymentStatus = (status, paymentType) => {
  if (status === 'Received') return 'Paid';
  if (status === 'Refund') return 'Refunded';
  if (status) return status;
  return paymentType === 'ONLINE' ? 'Pending' : 'Pending';
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [serverLimit] = useState(50);
  const [clientPage, setClientPage] = useState(1);
  const [filters, setFilters] = useState({
    orderStatus: '',
    paymentStatus: '',
    paymentType: '',
  });

  const clientLimit = 10;
  const clientTotalPages = Math.max(1, Math.ceil(orders.length / clientLimit));

  const fetchOrders = async () => {
    const params = new URLSearchParams({
      page: '1',
      limit: String(serverLimit),
    });

    if (filters.orderStatus) params.set('orderStatus', filters.orderStatus);
    if (filters.paymentStatus) params.set('paymentStatus', filters.paymentStatus);
    if (filters.paymentType) params.set('paymentType', filters.paymentType);

    const response = await api.get(`/orders?${params.toString()}`);
    setOrders(response.data.orders || []);
    setTotal(response.data.total || 0);
  };

  const fetchStaff = async () => {
    try {
      const response = await api.get('/auth/staff');
      setStaffMembers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching staff list:', error);
      setStaffMembers([]);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchStaff();
  }, [filters.orderStatus, filters.paymentStatus, filters.paymentType]);

  const updateStatus = async (id, orderStatus) => {
    await api.put(`/orders/${id}/status`, { orderStatus });
    fetchOrders();
  };

  const updatePaymentStatus = async (id, paymentStatus) => {
    await api.put(`/orders/${id}/payment-status`, { paymentStatus });
    fetchOrders();
  };

  const cancelOrder = async (id) => {
    await api.post(`/orders/${id}/cancel`, { reason: 'Cancelled by admin' });
    fetchOrders();
  };

  const requestReturn = async (id) => {
    await api.post(`/orders/${id}/return-request`, { reason: 'Requested by admin' });
    fetchOrders();
  };

  const approveReturn = async (id) => {
    await api.post(`/orders/${id}/approve-return`, { refundOnline: true });
    fetchOrders();
  };

  const assignOrder = async (id, assignedTo) => {
    if (!assignedTo) return;
    await api.put(`/orders/${id}/assign`, { assignedTo });
    fetchOrders();
  };

  const metrics = useMemo(() => {
    const onlineCount = orders.filter((o) => (o.paymentType || (o.paymentMethod === 'UPI' ? 'ONLINE' : 'COD')) === 'ONLINE').length;
    const codCount = orders.filter((o) => (o.paymentType || (o.paymentMethod === 'UPI' ? 'ONLINE' : 'COD')) === 'COD').length;
    const pendingPayments = orders.filter((o) => normalizePaymentStatus(o.paymentStatus, o.paymentType) === 'Pending').length;

    return { onlineCount, codCount, pendingPayments };
  }, [orders]);

  const visibleOrders = useMemo(() => {
    const start = (clientPage - 1) * clientLimit;
    return orders.slice(start, start + clientLimit);
  }, [orders, clientPage, clientLimit]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Orders</h1>
        <p className="text-white/60">Track order lifecycle, payment status, return requests and refunds.</p>
        <div className="mt-4 text-sm text-white/50">Total Orders: {total}</div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
<Select
          value={filters.orderStatus}
          onChange={(e) => {
            setClientPage(1);
            setFilters((prev) => ({ ...prev, orderStatus: e.target.value }));
          }}
        >
          <option value="">All Order Statuses</option>
          {ORDER_STATUSES.map((status) => (
            <Select.Option value={status}>{status}</Select.Option>
          ))}
        </Select>

        <Select
          value={filters.paymentStatus}
          onChange={(e) => {
            setClientPage(1);
            setFilters((prev) => ({ ...prev, paymentStatus: e.target.value }));
          }}
        >
          <option value="">All Payment Statuses</option>
          {PAYMENT_STATUSES.map((status) => (
            <Select.Option value={status}>{status}</Select.Option>
          ))}
        </Select>

        <Select
          value={filters.paymentType}
          onChange={(e) => {
            setClientPage(1);
            setFilters((prev) => ({ ...prev, paymentType: e.target.value }));
          }}
        >
          <option value="">All Payment Types</option>
          {PAYMENT_TYPES.map((type) => (
            <Select.Option value={type}>{type}</Select.Option>
          ))}
        </Select>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl backdrop-blur-md border border-indigo-400/30 bg-indigo-600/20 p-6">
          <p className="text-sm text-white/70">Online Orders</p>
          <p className="text-3xl font-bold text-white mt-2">{metrics.onlineCount}</p>
        </div>
        <div className="rounded-2xl backdrop-blur-md border border-amber-400/30 bg-amber-600/20 p-6">
          <p className="text-sm text-white/70">COD Orders</p>
          <p className="text-3xl font-bold text-white mt-2">{metrics.codCount}</p>
        </div>
        <div className="rounded-2xl backdrop-blur-md border border-rose-400/30 bg-rose-600/20 p-6">
          <p className="text-sm text-white/70">Pending Payments</p>
          <p className="text-3xl font-bold text-white mt-2">{metrics.pendingPayments}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl backdrop-blur-md border border-white/20 shadow-xl">
        <table className="w-full min-w-[1180px]">
          <thead className="border-b border-white/10 bg-white/5">
            <tr>
              <th className="p-4 text-left text-sm font-semibold text-white">Customer</th>
              <th className="p-4 text-left text-sm font-semibold text-white">Product</th>
              <th className="p-4 text-left text-sm font-semibold text-white">Amount</th>
              <th className="p-4 text-left text-sm font-semibold text-white">Payment Type</th>
              <th className="p-4 text-left text-sm font-semibold text-white">Payment Status</th>
              <th className="p-4 text-left text-sm font-semibold text-white">Order Status</th>
              <th className="p-4 text-left text-sm font-semibold text-white">Order ID</th>
              <th className="p-4 text-left text-sm font-semibold text-white">Assigned To</th>
              <th className="p-4 text-left text-sm font-semibold text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleOrders.map((order) => {
              const paymentType = order.paymentType || (order.paymentMethod === 'UPI' ? 'ONLINE' : 'COD');
              const paymentStatus = normalizePaymentStatus(order.paymentStatus, paymentType);
              const orderStatus = order.orderStatus || order.status || 'Pending';

              return (
                <tr key={order._id} className="border-t border-white/10 hover:bg-white/5 transition-colors">
                  <td className="p-4 text-sm">
                    <div className="font-medium text-white">{order.customerId?.name || '-'}</div>
                    <div className="text-xs text-white/50">{order.customerId?.phone || '-'}</div>
                  </td>
                  <td className="p-4 text-sm text-white/70">{order.product}</td>
                  <td className="p-4 text-sm text-white/70">Rs {Number(order.amount || order.finalPrice || order.price || 0).toFixed(2)}</td>
                  <td className="p-4 text-sm">
                    <Badge variant={paymentType === 'ONLINE' ? 'info' : 'warning'}>
                      {paymentType}
                    </Badge>
                  </td>
                  <td className="p-4 text-sm">
                    <Badge variant={paymentStatus.toLowerCase().replace(' ', '-') || 'pending'}>
                      {paymentStatus}
                    </Badge>
                  </td>
                  <td className="p-4 text-sm">
                    <Badge variant={orderStatus.toLowerCase().replace(/ /g, '-').replace('return-requested', 'warning') || 'pending'}>
                      {orderStatus}
                    </Badge>
                  </td>
                  <td className="p-4 text-xs font-mono text-white/70">
                    {order.orderId || order._id || '-'}
                  </td>
                  <td className="p-4 text-sm">
                    <Select value={order.assignedTo?._id || ''} onChange={(e) => assignOrder(order._id, e.target.value)} size="sm">
                      <option value="">Unassigned</option>
                      {staffMembers.map((staff) => (
                        <Select.Option value={staff._id}>{staff.name}</Select.Option>
                      ))}
                    </Select>
                  </td>
                  <td className="p-4 text-sm">
                    <div className="flex flex-col gap-2">
                      <Select value={paymentStatus} onChange={(e) => updatePaymentStatus(order._id, e.target.value)} size="sm">
                        {PAYMENT_STATUSES.map((status) => (
                          <Select.Option value={status}>{status}</Select.Option>
                        ))}
                      </Select>

                      <Select value={orderStatus} onChange={(e) => updateStatus(order._id, e.target.value)} size="sm">
                        {ORDER_STATUSES.map((status) => (
                          <Select.Option value={status}>{status}</Select.Option>
                        ))}
                      </Select>

                    </div>
                  </td>
                </tr>
              );
            })}
            {visibleOrders.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-white/50">No orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setClientPage((prev) => Math.max(1, prev - 1))}
            disabled={clientPage === 1}
            className="rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Previous
          </button>
          <button
            onClick={() => setClientPage((prev) => Math.min(clientTotalPages, prev + 1))}
            disabled={clientPage >= clientTotalPages}
            className="rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/30 px-4 py-2 text-sm font-semibold text-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Orders;
