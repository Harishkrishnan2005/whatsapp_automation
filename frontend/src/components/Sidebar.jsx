import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiBarChart2,
  FiCalendar,
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
  FiActivity,
  FiPieChart,
  FiLifeBuoy,
  FiSettings,
} from 'react-icons/fi';

const Sidebar = ({ open, onClose, isHovered, setIsHovered }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const businessType = user?.businessType || 'E_COMMERCE';

  const menuGroups = [
    {
      title: 'Main Hub',
      items: [
        { path: '/dashboard', label: 'Overview', icon: FiActivity },
        { path: '/chat', label: 'Live Chat', icon: FiMessageCircle },
      ]
    },
    {
      title: 'Management',
      items: user?.role === 'admin' ? (
        businessType === 'BOOKING' ? [
          { path: '/admin/chat-management', label: 'Chat Hub', icon: FiMessageCircle },
          { path: '/admin/appointments', label: 'Schedule', icon: FiCalendar },
          { path: '/customers', label: 'Customers', icon: FiUsers },
          { path: '/admin/chatbot', label: 'Bot Engine', icon: FiGrid },
        ] : [
          { path: '/admin/chat-management', label: 'Chat Hub', icon: FiMessageCircle },
          { path: '/orders', label: 'Orders', icon: FiShoppingCart },
          { path: '/products', label: 'Inventory', icon: FiPackage },
          { path: '/customers', label: 'Customers', icon: FiUsers },
          { path: '/campaigns', label: 'Marketing', icon: FiSend },
          { path: '/admin/chatbot', label: 'Bot Engine', icon: FiGrid },
        ]
      ) : (
        businessType === 'BOOKING' ? [
          { path: '/staff/bookings', label: 'Schedule', icon: FiCalendar },
          { path: '/staff/notes', label: 'Documents', icon: FiFileText },
        ] : [
          { path: '/staff/orders', label: 'Orders', icon: FiShoppingCart },
          { path: '/staff/notes', label: 'Documents', icon: FiFileText },
        ]
      )
    },
    {
      title: 'Performance',
      items: [
        { path: '/analytics', label: 'Analytics', icon: FiPieChart },
        { path: '/admin/advanced-analytics', label: 'Insights', icon: FiTrendingUp },
      ]
    },
    {
      title: 'System',
      items: user?.role === 'admin' ? [
        { path: '/admin/settings', label: 'Configuration', icon: FiSettings },
        { path: '/admin/support', label: 'Help Desk', icon: FiLifeBuoy },
      ] : [
        { path: '/admin/support', label: 'Help Desk', icon: FiLifeBuoy },
      ]
    }
  ];

  const superAdminItems = [
    {
      title: 'Platform Control',
      items: [
        { path: '/superadmin/dashboard', label: 'Pulse', icon: FiActivity },
        { path: '/superadmin/businesses', label: 'Tenants', icon: FiShield },
        { path: '/superadmin/subscriptions', label: 'Revenue', icon: FiCreditCard },
      ]
    }
  ];

  const activeGroups = user?.role === 'super_admin' ? superAdminItems : menuGroups;
  const isActive = (path) => location.pathname === path;

  // Sidebar dynamic width classes
  const sidebarWidth = isHovered ? 'md:w-72' : 'md:w-24';

  return (
    <>
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed inset-y-0 left-0 z-50 transform bg-[#001f3f] text-slate-400 transition-all duration-300 ease-in-out flex flex-col shadow-2xl border-r border-white/5 ${
          open ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0 ' + sidebarWidth
        }`}
      >
        {/* Brand Section */}
        <div className={`h-24 flex items-center gap-4 border-b border-white/5 transition-all duration-300 ${isHovered ? 'px-8' : 'px-6 justify-center'}`}>
           <div className="h-12 w-12 min-w-[3rem] rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-600/20">
             <FiActivity className="h-6 w-6" />
           </div>
           {isHovered && (
             <motion.div 
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity: 1, x: 0 }}
               className="flex flex-col min-w-0"
             >
               <span className="text-white font-black tracking-tight text-lg leading-tight truncate uppercase">
                 {user?.businessName || 'Hub Console'}
               </span>
               <div className="flex items-center gap-2 mt-1">
                 <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                   {user?.role || 'Staff'} Node
                 </span>
               </div>
             </motion.div>
           )}
           {isHovered && (
             <button onClick={onClose} className="ml-auto text-slate-500 md:hidden">
                <FiX className="h-6 w-6" />
             </button>
           )}
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 no-scrollbar">
          <div className="space-y-10">
            {activeGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-2">
                {isHovered ? (
                  <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4">
                    {group.title}
                  </p>
                ) : (
                  <div className="h-4 border-b border-white/5 mb-4" />
                )}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={onClose}
                        className={`flex items-center gap-4 rounded-2xl transition-all duration-200 group relative ${
                          isHovered ? 'px-4 py-3' : 'p-4 justify-center'
                        } ${
                          active 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                          : 'hover:bg-white/5 hover:text-white'
                         }`}
                      >
                        <Icon className={`h-5 w-5 min-w-[1.25rem] ${active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} transition-colors`} />
                        {isHovered && (
                          <motion.span 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-sm font-bold whitespace-nowrap"
                          >
                            {item.label}
                          </motion.span>
                        )}
                        {active && isHovered && (
                          <motion.div 
                            layoutId="active-pill"
                            className="ml-auto h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                          />
                        )}
                        {!isHovered && active && (
                          <div className="absolute left-0 w-1 h-8 bg-blue-600 rounded-r-full" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* User Context Section */}
        <div className={`p-4 border-t border-white/5 bg-white/[0.02] transition-all duration-300 ${isHovered ? 'p-6' : 'p-4 flex flex-col items-center'}`}>
           <button 
             onClick={() => { logout(); navigate('/'); }}
             className={`flex items-center justify-center gap-3 rounded-2xl border border-white/5 text-slate-500 text-xs font-black uppercase tracking-widest hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/20 transition-all ${
               isHovered ? 'w-full px-6 py-4' : 'w-12 h-12'
             }`}
             title="Termination"
           >
             <FiLogOut className="h-5 w-5" />
             {isHovered && <span>Termination</span>}
           </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden" onClick={onClose} />}
    </>
  );
};

export default Sidebar;

