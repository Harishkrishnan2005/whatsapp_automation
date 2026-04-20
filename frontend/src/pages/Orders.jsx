import { useEffect, useMemo, useState } from 'react';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import api from '../utils/api';
import useAnalyticsStore from '../store/analyticsStore';
import { getDateRangePayload } from '../utils/dateRange';

const ORDER_STATUSES = ['Pending', 'Confirmed', 'Cancelled', 'Delivered', 'Return Requested', 'Returned'];
const PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed', 'Refunded'];
const PAYMENT_TYPES = ['COD', 'ONLINE'];
const REFUND_STATUSES = ['NONE', 'REQUESTED', 'PROCESSED', 'REJECTED'];

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
  const dateRange = useAnalyticsStore((state) => state.dateRange);
  const searchQuery = useAnalyticsStore((state) => state.searchQuery);

  const clientLimit = 10;
  const clientTotalPages = Math.max(1, Math.ceil(orders.length / clientLimit));

  const fetchOrders = async () => {
    try {
      const { from, to } = getDateRangePayload(dateRange);
      const params = new URLSearchParams({
        page: '1',
        limit: String(serverLimit),
      });

      if (filters.orderStatus) params.set('orderStatus', filters.orderStatus);
      if (filters.paymentStatus) params.set('paymentStatus', filters.paymentStatus);
      if (filters.paymentType) params.set('paymentType', filters.paymentType);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (searchQuery) params.set('search', searchQuery);

      const response = await api.get(`/orders?${params.toString()}`);
      setOrders(response.data.orders || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
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
  }, [filters.orderStatus, filters.paymentStatus, filters.paymentType, dateRange, searchQuery]);

  useEffect(() => {
    setClientPage(1);
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

  const assignOrder = async (id, assignedTo) => {
    try {
      if (!assignedTo) return;
      await api.put(`/orders/${id}/assign`, { assignedTo });
      fetchOrders();
    } catch (error) {
      console.error('Error assigning order:', error);
    }
  };

  const updateRefundStatus = async (id, refundStatus) => {
    try {
      await api.put(`/orders/${id}/refund-status`, { refundStatus });
      fetchOrders();
    } catch (error) {
      console.error('Error updating refund status:', error);
    }
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
    <div className="space-y-10 animate-fade-in pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Orders</h1>
          <p className="mt-2 text-slate-500 font-medium">Manage your customer orders and payment statuses here.</p>
        </div>
        <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200/60 shadow-sm">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Orders</p>
           <p className="text-sm font-bold text-slate-900 mt-1">{total} Orders Found</p>
        </div>
      </header>

      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200/60 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Order Status</label>
           <select 
             value={filters.orderStatus} 
             onChange={(e) => { setClientPage(1); setFilters(f => ({ ...f, orderStatus: e.target.value })); }}
             className="w-full bg-slate-50/50 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:bg-white transition-all"
           >
              <option value="">All Statuses</option>
              {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
           </select>
        </div>
        <div className="flex-1">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Payment Status</label>
           <select 
             value={filters.paymentStatus} 
             onChange={(e) => { setClientPage(1); setFilters(f => ({ ...f, paymentStatus: e.target.value })); }}
             className="w-full bg-slate-50/50 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:bg-white transition-all"
           >
              <option value="">All Payments</option>
              {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
           </select>
        </div>
        <div className="flex-1">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Payment Type</label>
           <select 
             value={filters.paymentType} 
             onChange={(e) => { setClientPage(1); setFilters(f => ({ ...f, paymentType: e.target.value })); }}
             className="w-full bg-slate-50/50 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:bg-white transition-all"
           >
              <option value="">All Types</option>
              {PAYMENT_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
           </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {[
          { label: 'Cloud Transfers', value: metrics.onlineCount, sub: 'Online Yield', color: 'blue' },
          { label: 'Physical Settlements', value: metrics.codCount, sub: 'COD Base', color: 'indigo' },
          { label: 'Unresolved Nodes', value: metrics.pendingPayments, sub: 'Liquidity Latency', color: 'rose' },
        ].map((m, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between h-32">
             <div className="flex justify-between items-start">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{m.label}</span>
               <div className={`h-1.5 w-1.5 rounded-full bg-${m.color}-500`} />
             </div>
             <div>
               <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{m.value}</p>
               <p className="text-[9px] font-bold text-slate-400 mt-1">{m.sub}</p>
             </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Identity Node</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Resource Matrix</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Yield Val</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">State</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Utility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibleOrders.map((order) => {
                const paymentType = order.paymentType || (order.paymentMethod === 'UPI' ? 'ONLINE' : 'COD');
                const paymentStatus = normalizePaymentStatus(order.paymentStatus, paymentType);
                const orderStatus = order.orderStatus || order.status || 'Pending';

                return (
                  <tr key={order._id} className="group hover:bg-slate-50 transition-colors duration-300">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                         <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs ring-4 ring-white shadow-sm">
                            {order.customerId?.name ? order.customerId.name[0].toUpperCase() : '?'}
                         </div>
                         <div>
                            <p className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">{order.customerId?.name || 'ANONYMOUS'}</p>
                            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">ID: {order.orderId || order._id.slice(-8)}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs font-bold text-slate-600 truncate max-w-[150px]">{order.product}</p>
                      <span className="text-[9px] font-black uppercase text-blue-600 tracking-widest">{paymentType} VECTOR</span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-slate-900 tracking-tighter hover:text-blue-600 transition-colors">Rs {Number(order.amount || order.finalPrice || 0).toFixed(2)}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1.5">
                         <span className={`inline-flex px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-[0.15em] border ${
                           paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                         }`}>
                           Payment: {paymentStatus}
                         </span>
                         <span className={`inline-flex px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-[0.15em] border ${
                           orderStatus === 'Pending' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-900 text-white border-slate-900 shadow-sm'
                         }`}>
                           Order: {orderStatus}
                         </span>
                         {order.refundStatus && order.refundStatus !== 'NONE' && (
                            <span className={`inline-flex px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-[0.15em] border ${
                              order.refundStatus === 'REQUESTED' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                            }`}>
                              Refund: {order.refundStatus}
                            </span>
                         )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className="flex flex-col gap-2 items-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <select 
                            value={order.assignedTo?._id || ''} 
                            onChange={(e) => assignOrder(order._id, e.target.value)}
                            className="bg-slate-100/50 border-none text-[9px] font-black uppercase tracking-widest rounded-lg px-3 py-1.5 outline-none cursor-pointer hover:bg-white border hover:border-slate-200 transition-all"
                          >
                             <option value="">Unassigned Node</option>
                             {staffMembers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                          </select>
                          <div className="flex gap-2">
                             <select 
                               value={orderStatus} 
                               onChange={(e) => updateStatus(order._id, e.target.value)}
                               className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg px-3 py-1.5 border-none outline-none cursor-pointer"
                             >
                                {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                             </select>
                             {order.refundStatus && order.refundStatus !== 'NONE' && (
                                <select 
                                  value={order.refundStatus} 
                                  onChange={(e) => updateRefundStatus(order._id, e.target.value)}
                                  className="bg-rose-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg px-3 py-1.5 border-none outline-none cursor-pointer"
                                >
                                   {REFUND_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                              )}
                          </div>
                       </div>
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                   <td colSpan={5} className="py-24 text-center opacity-30 italic font-black uppercase tracking-widest leading-none">Log Buffer Exhausted</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {orders.length > clientLimit && (
          <div className="mt-auto px-8 py-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/20">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {clientPage} for Client Index</p>
             <div className="flex gap-2">
                <button disabled={clientPage === 1} onClick={() => setClientPage(p => p - 1)} className="btn-secondary h-10 px-4 text-[10px] uppercase font-black">Back</button>
                <button disabled={clientPage >= clientTotalPages} onClick={() => setClientPage(p => p + 1)} className="btn-primary h-10 px-6 text-[10px] uppercase font-black">Advance</button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
