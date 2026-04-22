import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiMoreVertical, 
  FiPackage, 
  FiTruck, 
  FiXCircle, 
  FiCheckCircle, 
  FiRotateCcw, 
  FiClock, 
  FiUserPlus, 
  FiCreditCard,
  FiDollarSign,
  FiFilter
} from 'react-icons/fi';
import api from '../utils/api';
import useAnalyticsStore from '../store/analyticsStore';
import { getDateRangePayload } from '../utils/dateRange';

const ORDER_STATUSES = [
  { label: 'Pending', icon: FiClock, color: 'blue' },
  { label: 'Confirmed', icon: FiCheckCircle, color: 'emerald' },
  { label: 'Cancelled', icon: FiXCircle, color: 'rose' },
  { label: 'Delivered', icon: FiPackage, color: 'indigo' },
  { label: 'Return Requested', icon: FiRotateCcw, color: 'amber' },
  { label: 'Returned', icon: FiRotateCcw, color: 'slate' }
];

const PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed', 'Refunded'];
const PAYMENT_TYPES = ['COD', 'ONLINE'];
const REFUND_STATUSES = ['NONE', 'REQUESTED', 'PROCESSED', 'REJECTED'];

const normalizePaymentStatus = (status, paymentType) => {
  if (status === 'Received') return 'Paid';
  if (status === 'Refund') return 'Refunded';
  if (status) return status;
  return 'Pending';
};

const StatusDropdown = ({ currentStatus, onUpdate, options, label = "Update", onOpenChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen]);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg px-3.5 py-2 transition-all shadow-sm"
      >
        {currentStatus}
        <FiMoreVertical className="h-3 w-3" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 z-[70] overflow-hidden py-1"
            >
              {options.map((option) => {
                const Icon = option.icon || FiCheckCircle;
                return (
                  <button
                    key={option.label || option}
                    onClick={() => {
                      onUpdate(option.label || option);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 flex items-center gap-3 transition-colors ${
                      currentStatus === (option.label || option) ? 'text-blue-700 bg-blue-50' : 'text-slate-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label || option}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
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
  const [activeDropdown, setActiveDropdown] = useState(null);
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
    const totalOrders = orders.length;
    const deliveredOrders = orders.filter((o) => (o.orderStatus || o.status) === 'Delivered').length;
    const cancelledOrders = orders.filter((o) => (o.orderStatus || o.status) === 'Cancelled').length;
    const returnedOrders = orders.filter((o) => (o.orderStatus || o.status) === 'Returned').length;
    const onlinePaymentsCount = orders.filter((o) => (o.paymentType || (o.paymentMethod === 'UPI' ? 'ONLINE' : 'COD')) === 'ONLINE').length;
    const codPaymentsCount = orders.filter((o) => (o.paymentType || (o.paymentMethod === 'UPI' ? 'ONLINE' : 'COD')) === 'COD').length;

    return { totalOrders, deliveredOrders, cancelledOrders, returnedOrders, onlinePaymentsCount, codPaymentsCount };
  }, [orders]);

  const visibleOrders = useMemo(() => {
    const start = (clientPage - 1) * clientLimit;
    return orders.slice(start, start + clientLimit);
  }, [orders, clientPage, clientLimit]);

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Header & Search Infrastructure */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
             <h1 className="text-3xl font-black text-slate-900 tracking-tight">Orders</h1>
             <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Live Infrastructure</span>
          </div>
          <p className="mt-1 text-slate-500 font-medium tracking-tight">Monitoring global settlement nodes and resource dispatch matrices.</p>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200/60 shadow-sm w-full xl:w-auto">
          <div className="flex-1 xl:w-96 relative group">
            <FiFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search data network..." 
              value={searchQuery}
              onChange={(e) => useAnalyticsStore.getState().setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-xl pl-11 pr-12 py-3 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[10px] font-black text-slate-400">
               ⌘ K
            </div>
          </div>
          <div className="flex items-center gap-3 px-6 border-l border-slate-100">
             <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <FiPackage className="h-5 w-5" />
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Flow</p>
                <p className="text-sm font-black text-slate-900 mt-1">{total} Nodes</p>
             </div>
          </div>
        </div>
      </div>

      {/* KPI Resource Matrix */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-6">
        {[
          { label: 'Total Orders', value: metrics.totalOrders, icon: FiPackage, color: 'blue' },
          { label: 'Delivered Orders', value: metrics.deliveredOrders, icon: FiTruck, color: 'emerald' },
          { label: 'Cancelled Orders', value: metrics.cancelledOrders, icon: FiXCircle, color: 'rose' },
          { label: 'Returned Orders', value: metrics.returnedOrders, icon: FiRotateCcw, color: 'amber' },
          { label: 'Online Payments', value: metrics.onlinePaymentsCount, icon: FiCreditCard, color: 'indigo' },
          { label: 'COD Payments', value: metrics.codPaymentsCount, icon: FiDollarSign, color: 'slate' },
        ].map((m, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm flex flex-col gap-8 relative overflow-hidden group"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-${m.color}-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700`} />
            <div className={`h-14 w-14 rounded-2xl bg-${m.color}-50 flex items-center justify-center text-${m.color}-600`}>
              <m.icon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{m.value}</p>
              <p className="text-xs font-bold text-slate-400 mt-3 uppercase tracking-widest">{m.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Registry Matrix */}
      <div className="bg-white rounded-[3rem] border border-slate-200/60 shadow-sm flex flex-col min-h-[600px]">
        {/* Registry Filters */}
        <div className="px-8 py-4 border-b border-slate-50 bg-slate-50/20 flex flex-wrap gap-4">
           <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2">
              <FiFilter className="h-3 w-3 text-slate-400" />
              <select 
                value={filters.orderStatus} 
                onChange={(e) => setFilters(f => ({ ...f, orderStatus: e.target.value }))}
                className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none cursor-pointer"
              >
                 <option value="">Status: All Nodes</option>
                 {ORDER_STATUSES.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
              </select>
           </div>
           <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2">
              <FiCreditCard className="h-3 w-3 text-slate-400" />
              <select 
                value={filters.paymentStatus} 
                onChange={(e) => setFilters(f => ({ ...f, paymentStatus: e.target.value }))}
                className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none cursor-pointer"
              >
                 <option value="">Settlement: All</option>
                 {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
           </div>
        </div>

        <div className="overflow-visible">
          <table className="w-full text-left">
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {visibleOrders.map((order, idx) => {
                  const paymentType = order.paymentType || (order.paymentMethod === 'UPI' ? 'ONLINE' : 'COD');
                  const paymentStatus = normalizePaymentStatus(order.paymentStatus, paymentType);
                  const orderStatus = order.orderStatus || order.status || 'Pending';

                  return (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={order._id} 
                      className={`group hover:bg-slate-50/50 transition-colors duration-500 relative ${activeDropdown === order._id ? 'z-50' : 'z-0 hover:z-10'}`}
                    >
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-5">
                           <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xl shadow-blue-500/20 group-hover:scale-110 transition-transform">
                              {order.customerId?.name ? order.customerId.name[0].toUpperCase() : '?'}
                           </div>
                           <div>
                              <p className="text-base font-black text-slate-900 uppercase tracking-tighter leading-none">{order.customerId?.name || 'GUEST AGENT'}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-2 tracking-widest">{order.orderId || order._id.slice(-8)}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <p className="text-sm font-bold text-slate-800 leading-none">
                          {order.items?.length
                            ? order.items.map((item) => item.name || 'Product').join(', ')
                            : (order.product || 'UNKNOWN_RESOURCE')}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Items: {order.items?.length || 1}</p>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <p className="text-lg font-black text-slate-900 tracking-tighter leading-none">₹{Number(order.amount || order.finalPrice || 0).toFixed(2)}</p>
                      </td>
                      <td className="px-10 py-8">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${
                          paymentType === 'ONLINE' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}>
                          {paymentType}
                        </span>
                      </td>
                      <td className="px-10 py-8">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${
                          paymentStatus === 'Paid' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-50 text-slate-400 border border-slate-100'
                        }`}>
                          {paymentStatus}
                        </span>
                      </td>
                      <td className="px-10 py-8">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${
                          orderStatus === 'Pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 
                          orderStatus === 'Confirmed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          orderStatus === 'Cancelled' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                          orderStatus === 'Returned' ? 'bg-slate-50 text-slate-600 border border-slate-100' :
                          'bg-indigo-50 text-indigo-600 border border-indigo-100'
                        }`}>
                          {orderStatus}
                        </span>
                      </td>
                      <td className="px-10 py-8 text-right">
                         <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                            {orderStatus !== 'Delivered' && orderStatus !== 'Cancelled' && (
                              <button
                                onClick={() => updateStatus(order._id, 'Delivered')}
                                className="rounded-xl bg-emerald-600 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-white"
                              >
                                Mark as Delivered
                              </button>
                            )}
                            {orderStatus !== 'Cancelled' && orderStatus !== 'Delivered' && (
                              <button
                                onClick={() => updateStatus(order._id, 'Cancelled')}
                                className="rounded-xl bg-rose-600 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-white"
                              >
                                Cancel Order
                              </button>
                            )}
                            {paymentStatus !== 'Paid' && (
                              <button
                                onClick={() => updatePaymentStatus(order._id, 'Paid')}
                                className="rounded-xl bg-blue-600 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-white"
                              >
                                Mark Payment as Paid
                              </button>
                            )}

                            <div className="relative flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 hover:bg-white transition-all">
                               <FiUserPlus className="h-3 w-3 text-slate-400" />
                               <select 
                                 value={order.assignedTo?._id || ''} 
                                 onChange={(e) => assignOrder(order._id, e.target.value)}
                                 className="bg-transparent border-none text-[9px] font-black uppercase tracking-widest text-slate-600 outline-none cursor-pointer"
                               >
                                  <option value="">Assign...</option>
                                  {staffMembers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                               </select>
                            </div>
                         </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-40 opacity-20">
             <FiPackage className="h-20 w-20 mb-6" />
             <p className="text-xl font-black uppercase tracking-[0.5em]">No Registry Activity</p>
          </div>
        )}

        {orders.length > clientLimit && (
          <div className="mt-auto px-10 py-8 border-t border-slate-100 flex items-center justify-between bg-slate-50/20">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registry Page {clientPage} of {clientTotalPages}</p>
             <div className="flex gap-4">
                <button 
                  disabled={clientPage === 1} 
                  onClick={() => setClientPage(p => p - 1)} 
                  className="h-12 px-8 rounded-2xl bg-white border border-slate-200 text-[10px] uppercase font-black tracking-widest hover:bg-slate-50 disabled:opacity-30 transition-all"
                >
                  Regress
                </button>
                <button 
                  disabled={clientPage >= clientTotalPages} 
                  onClick={() => setClientPage(p => p + 1)} 
                  className="h-12 px-10 rounded-2xl bg-slate-900 text-white text-[10px] uppercase font-black tracking-widest hover:bg-slate-800 disabled:opacity-30 shadow-xl shadow-slate-900/10 transition-all"
                >
                  Advance
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
