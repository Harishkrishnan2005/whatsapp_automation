import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiShoppingCart, FiUser, FiPackage, FiCreditCard, FiHash, FiClock } from 'react-icons/fi';
import api from '../../utils/api';
import useAnalyticsStore from '../../store/analyticsStore';
import { getDateRangePayload } from '../../utils/dateRange';
import Badge from '../../components/ui/Badge';

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

  const getStatusVariant = (status) => {
    if (status === 'Delivered' || status === 'Paid') return 'delivered';
    if (status === 'Cancelled' || status === 'Failed') return 'error';
    if (status === 'Returned' || status === 'Refunded') return 'neutral';
    return 'pending';
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Header & Logistics Hub */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
             <h1 className="text-3xl font-black text-slate-900 tracking-tight">Assigned Distributions</h1>
             <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Logistics Infrastructure</span>
          </div>
          <p className="mt-1 text-slate-500 font-medium tracking-tight">Managing resource allocation and payment verification for assigned nodes.</p>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200/60 shadow-sm w-full xl:w-auto">
          <div className="flex items-center gap-4 px-6 border-r border-slate-100">
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
               <FiShoppingCart className="h-5 w-5" />
            </div>
            <div>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Assigned</p>
               <p className="text-xs font-black text-slate-900 mt-1 uppercase leading-none">{total} Units</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-6">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
               <FiCreditCard className="h-5 w-5" />
            </div>
            <div>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Revenue Node</p>
               <p className="text-xs font-black text-slate-900 mt-1 uppercase leading-none">Rs {orders.reduce((acc, curr) => acc + Number(curr.amount || 0), 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm flex flex-col min-h-[600px]">
        <header className="px-10 py-8 border-b border-slate-50 bg-slate-50/20 flex items-center justify-between">
           <div>
              <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Logistics Ledger</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">Operational Distribution Management • Protocol ACTIVE</p>
           </div>
        </header>

        <div className="overflow-visible">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Stakeholder Node</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Resource Identifier</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Value Matrix</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Logistics Protocol</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Settlement State</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.map((order) => {
                const orderStatus = order.orderStatus || order.status || 'Pending';
                const paymentStatus = order.paymentStatus || 'Pending';
                return (
                  <tr key={order._id} className="group hover:bg-slate-50 transition-all duration-300">
                    <td className="px-10 py-7">
                      <div className="flex items-center gap-5">
                        <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xl shadow-blue-600/10 group-hover:scale-110 transition-transform duration-500 ring-4 ring-white">
                           {order.customerId?.name ? order.customerId.name[0].toUpperCase() : '?'}
                        </div>
                        <div>
                           <p className="text-base font-bold text-slate-900 tracking-tight leading-none group-hover:text-blue-600 transition-colors uppercase">{order.customerId?.name || 'EXTERNAL AGENT'}</p>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 leading-none">{order.customerId?.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-7">
                       <div className="flex items-center gap-3">
                          <FiPackage className="text-slate-300 h-4 w-4" />
                          <p className="text-sm font-black text-slate-900 uppercase tracking-tighter line-clamp-1">{order.product}</p>
                       </div>
                    </td>
                    <td className="px-10 py-7">
                       <div className="flex flex-col">
                          <p className="text-base font-black text-slate-900 tracking-tighter leading-none">₹{Number(order.amount || 0).toFixed(2)}</p>
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1.5 leading-none">Commercial Val</p>
                       </div>
                    </td>
                    <td className="px-10 py-7">
                       <div className="relative w-44">
                          <select
                            value={orderStatus}
                            onChange={(e) => updateStatus(order._id, e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all cursor-pointer appearance-none"
                          >
                            {ORDER_STATUSES.map((status) => (
                              <option key={status} value={status}>{status.toUpperCase()}</option>
                            ))}
                          </select>
                          <FiClock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                       </div>
                    </td>
                    <td className="px-10 py-7">
                       <div className="relative w-44">
                          <select
                            value={paymentStatus}
                            onChange={(e) => updatePaymentStatus(order._id, e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all cursor-pointer appearance-none"
                          >
                            {PAYMENT_STATUSES.map((status) => (
                              <option key={status} value={status}>{status.toUpperCase()}</option>
                            ))}
                          </select>
                          <FiCreditCard className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                       </div>
                    </td>
                    <td className="px-10 py-7 text-right">
                       <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2rem] transition-all group-hover:text-slate-400">ID {order.orderId || order._id.slice(-6).toUpperCase()}</p>
                    </td>
                  </tr>
                );
              })}
              {!loading && orders.length === 0 && (
                <tr>
                   <td colSpan={6} className="py-32 text-center grayscale opacity-30 select-none">
                      <div className="flex flex-col items-center">
                         <FiPackage className="h-20 w-20 mb-6 text-slate-300" />
                         <p className="font-black uppercase tracking-[0.4em] text-sm text-slate-400 italic">No Distributions Detected</p>
                      </div>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-auto px-10 py-8 border-t border-slate-100 flex items-center justify-between bg-slate-50/20">
           <div className="flex items-center gap-4">
              <div className={`h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse`} />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none">Personnel Logged • Operational Security Matrix ACTIVE</p>
           </div>
           <div className="flex gap-3">
             <button
               disabled={page === 1}
               onClick={() => setPage(p => Math.max(1, p - 1))}
               className="h-12 px-8 rounded-2xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all disabled:opacity-30"
             >
               Regress
             </button>
             <button
               disabled={page >= totalPages}
               onClick={() => setPage(p => Math.min(totalPages, p + 1))}
               className="h-12 px-10 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-black transition-all disabled:opacity-30"
             >
               Advance
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default StaffOrders;
