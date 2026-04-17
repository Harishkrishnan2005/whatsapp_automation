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
    <div className="space-y-10 animate-fade-in pb-10">
      <header>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Assigned Distributions</h1>
        <p className="mt-2 text-slate-500 font-medium">Managing logistical nodes and payment verification for your assigned sectors.</p>
      </header>

      <div className="bg-white rounded-[3rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Stakeholder Node</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Product Detail</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Economic Value</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Logistics State</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Economic State</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Utility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.map((order) => {
                const orderStatus = order.orderStatus || order.status || 'Pending';
                const paymentStatus = order.paymentStatus || 'Pending';
                return (
                  <tr key={order._id} className="group hover:bg-slate-50 transition-colors duration-300">
                    <td className="px-10 py-7">
                      <div className="flex items-center gap-5">
                        <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-xl shadow-slate-900/10 group-hover:scale-110 transition-transform duration-500 ring-4 ring-white">
                           {order.customerId?.name ? order.customerId.name[0].toUpperCase() : '?'}
                        </div>
                        <div>
                           <p className="text-base font-bold text-slate-900 tracking-tight leading-none group-hover:text-blue-600 transition-colors uppercase">{order.customerId?.name || 'EXTERNAL AGENT'}</p>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{order.customerId?.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-7">
                       <p className="text-sm font-black text-slate-900 uppercase tracking-tighter line-clamp-1">{order.product}</p>
                    </td>
                    <td className="px-10 py-7">
                       <p className="text-base font-black text-slate-900 tracking-tighter">Rs {Number(order.amount || 0).toFixed(2)}</p>
                    </td>
                    <td className="px-10 py-7">
                      <select
                        value={orderStatus}
                        onChange={(e) => updateStatus(order._id, e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all cursor-pointer"
                      >
                        {ORDER_STATUSES.map((status) => (
                          <option key={status} value={status}>{status.toUpperCase()}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-10 py-7">
                      <select
                        value={paymentStatus}
                        onChange={(e) => updatePaymentStatus(order._id, e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all cursor-pointer"
                      >
                        {PAYMENT_STATUSES.map((status) => (
                          <option key={status} value={status}>{status.toUpperCase()}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-10 py-7 text-right">
                       <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2rem] transition-all group-hover:text-slate-400">{order.orderId || order._id}</p>
                    </td>
                  </tr>
                );
              })}
              {!loading && orders.length === 0 && (
                <tr>
                   <td colSpan={6} className="py-24 text-center opacity-30 select-none grayscale">
                      <FiPackage className="h-20 w-20 mx-auto mb-6 text-slate-300" />
                      <p className="font-black uppercase tracking-[0.4em] text-sm text-slate-400">Distribution Ledger Empty</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-auto px-10 py-8 border-t border-slate-100 flex items-center justify-between bg-slate-50/20">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none">Assigned Logistics Hub • Node Operational</p>
           <div className="flex gap-3">
             <button
               disabled={page === 1}
               onClick={() => setPage(p => Math.max(1, p - 1))}
               className="btn-secondary h-12 px-6 text-[10px] uppercase font-black tracking-widest disabled:opacity-30"
             >
               Previous
             </button>
             <button
               disabled={page >= totalPages}
               onClick={() => setPage(p => Math.min(totalPages, p + 1))}
               className="btn-primary h-12 px-8 text-[10px] uppercase font-black tracking-widest shadow-none"
             >
               Next
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default StaffOrders;
