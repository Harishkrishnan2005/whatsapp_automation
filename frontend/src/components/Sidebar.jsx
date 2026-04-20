import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  FiBarChart2,
  FiCalendar,
  FiClipboard,
  FiFileText,
  FiGrid,
  FiMessageCircle,
  FiPackage,
  FiSend,
  FiShoppingCart,
  FiTrendingUp,
  FiUserCheck,
  FiUsers,
  FiX,
  FiLogOut,
  FiShield,
  FiCreditCard,
  FiAlertCircle,
  FiClock,
} from 'react-icons/fi';

const Sidebar = ({ open, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const businessType = user?.businessType || 'E_COMMERCE';

  const commonMenuItems = [
    { path: '/dashboard', label: 'Overview', icon: FiGrid },
  ];

  const adminMenuItems =
    businessType === 'BOOKING'
      ? [
          { path: '/chat', label: 'Live Chat', icon: FiMessageCircle },
          { path: '/customers', label: 'Customers', icon: FiUsers },
          { path: '/admin/appointments', label: 'Appointments', icon: FiCalendar },
          { path: '/admin/chatbot', label: 'Chatbot Settings', icon: FiMessageCircle },
          { path: '/admin/simulation-chat', label: 'Management', icon: FiMessageCircle },
          { path: '/analytics', label: 'Reports', icon: FiBarChart2 },
          { path: '/admin/staff', label: 'Manage Staff', icon: FiUserCheck },
          { path: '/admin/advanced-analytics', label: 'Detailed Reports', icon: FiTrendingUp },
          { path: '/admin/support', label: 'Support Desk', icon: FiMessageCircle },
          { path: '/pricing', label: 'Billing', icon: FiCreditCard },
        ]
      : [
          { path: '/chat', label: 'Live Chat', icon: FiMessageCircle },
          { path: '/customers', label: 'Customers', icon: FiUsers },
          { path: '/orders', label: 'Orders', icon: FiShoppingCart },
          { path: '/campaigns', label: 'Marketing', icon: FiSend },
          { path: '/products', label: 'Products', icon: FiPackage },
          { path: '/analytics', label: 'Reports', icon: FiBarChart2 },
          { path: '/admin/chatbot', label: 'Chatbot Settings', icon: FiMessageCircle },
          { path: '/admin/simulation-chat', label: 'Management', icon: FiMessageCircle },
          { path: '/admin/staff', label: 'Manage Staff', icon: FiUserCheck },
          { path: '/admin/support', label: 'Support Desk', icon: FiMessageCircle },
          { path: '/pricing', label: 'Billing', icon: FiCreditCard },
        ];

  const staffMenuItems =
    businessType === 'BOOKING'
      ? [
          { path: '/staff/chat', label: 'My Conversations', icon: FiMessageCircle },
          { path: '/staff/bookings', label: 'My Schedule', icon: FiCalendar },
          { path: '/staff/notes', label: 'Customer Files', icon: FiFileText },
        ]
      : [
          { path: '/staff/chat', label: 'My Conversations', icon: FiMessageCircle },
          { path: '/staff/orders', label: 'Assigned Orders', icon: FiShoppingCart },
          { path: '/staff/notes', label: 'Customer Files', icon: FiFileText },
        ];

  const superAdminMenuItems = [
    { path: '/superadmin/dashboard', label: 'Admin Panel', icon: FiShield },
    { path: '/superadmin/businesses', label: 'Businesses', icon: FiUsers },
    { path: '/superadmin/subscriptions', label: 'Plans', icon: FiTrendingUp },
  ];

  const menuItems = user?.role === 'super_admin'
    ? superAdminMenuItems
    : [
        ...commonMenuItems,
        ...(user?.role === 'admin' ? adminMenuItems : staffMenuItems),
      ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-gradient-to-b from-[#0f172a] to-[#1e293b] border-r border-slate-800 transition-transform duration-300 ease-in-out md:translate-x-0 flex flex-col ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-6 mb-4">
           <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                <FiGrid className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Company Panel</span>
                <span className="text-sm font-black tracking-tight text-white uppercase truncate max-w-[140px]">
                  {user?.businessName || user?.businessId?.businessName || 'Ematix Platform'}
                </span>
              </div>
           </div>
           <button onClick={onClose} className="text-slate-500 md:hidden hover:text-white transition-colors">
              <FiX className="h-6 w-6" />
           </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          <div className="space-y-1">
            <p className="px-4 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Main Menu</p>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                   to={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                    active 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                   }`}
                >
                  <Icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${active ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                  <span className="text-sm font-bold tracking-tight">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-6 mt-auto border-t border-slate-800 bg-black/10">
          <button 
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-slate-800 text-slate-400 text-sm font-black uppercase tracking-widest hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/20 transition-all"
          >
            <FiLogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden" onClick={onClose} />}
    </>
  );
};

export default Sidebar;

