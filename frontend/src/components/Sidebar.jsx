import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  FiActivity,
  FiCalendar,
  FiCreditCard,
  FiFileText,
  FiGrid,
  FiLifeBuoy,
  FiLogOut,
  FiMessageCircle,
  FiPackage,
  FiPieChart,
  FiSend,
  FiSettings,
  FiShield,
  FiShoppingCart,
  FiTrendingUp,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { FEATURES, getFeatureAccessState } from '../utils/accessControl';

const normalizeRole = (role) => String(role || '').trim().toUpperCase();

const matchesRole = (item, normalizedRole) => {
  if (!Array.isArray(item.roles) || item.roles.length === 0) {
    return true;
  }

  return item.roles.includes(normalizedRole);
};

const matchesBusinessType = (item, businessType) => {
  if (!Array.isArray(item.businessTypes) || item.businessTypes.length === 0) {
    return true;
  }

  return item.businessTypes.includes(businessType);
};

const matchesStaffRole = (item, staffRole) => {
  if (!Array.isArray(item.staffRoles) || item.staffRoles.length === 0) {
    return true;
  }

  return item.staffRoles.includes(staffRole);
};

const Sidebar = ({ open, onClose, isHovered, setIsHovered }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const normalizedRole = normalizeRole(user?.role);
  const businessType = user?.businessType || 'E_COMMERCE';
  const staffRole = user?.staffRole || '';

  const baseMenuGroups = [
    {
      title: 'Main Hub',
      items: [
        { name: 'Overview', path: '/dashboard', icon: FiActivity, roles: ['ADMIN'] },
        { name: 'Live Chat', path: '/chat', icon: FiMessageCircle, roles: ['ADMIN'], feature: FEATURES.CHAT },
        { name: 'Overview', path: '/staff/dashboard', icon: FiActivity, roles: ['STAFF'] },
      ],
    },
    {
      title: 'Management',
      items: [
        { name: 'Chat Hub', path: '/admin/chat-management', icon: FiMessageCircle, roles: ['ADMIN'], feature: FEATURES.CHAT },
        { name: 'Orders', path: '/orders', icon: FiShoppingCart, roles: ['ADMIN'], businessTypes: ['E_COMMERCE'], feature: FEATURES.ORDERS },
        { name: 'Inventory', path: '/products', icon: FiPackage, roles: ['ADMIN'], businessTypes: ['E_COMMERCE'] },
        { name: 'Customers', path: '/customers', icon: FiUsers, roles: ['ADMIN'], feature: FEATURES.CUSTOMERS },
        { name: 'Marketing', path: '/campaigns', icon: FiSend, roles: ['ADMIN'], businessTypes: ['E_COMMERCE'], feature: FEATURES.CAMPAIGN },
        { name: 'Schedule', path: '/admin/appointments', icon: FiCalendar, roles: ['ADMIN'], businessTypes: ['BOOKING'] },
        { name: 'Bot Engine', path: '/admin/chatbot', icon: FiGrid, roles: ['ADMIN'] },
        { name: 'Staff Management', path: '/admin/staff', icon: FiUsers, roles: ['ADMIN'] },
        { name: 'Assigned Chats', path: '/staff/chats', icon: FiMessageCircle, roles: ['STAFF'], staffRoles: ['SUPPORT', 'SALES', 'MANAGER'], feature: FEATURES.CHAT },
        { name: 'Assigned Orders', path: '/staff/orders', icon: FiShoppingCart, roles: ['STAFF'], businessTypes: ['E_COMMERCE'], staffRoles: ['SALES', 'MANAGER'], feature: FEATURES.ORDERS },
        { name: 'Tickets', path: '/staff/tickets', icon: FiLifeBuoy, roles: ['STAFF'], staffRoles: ['SUPPORT', 'MANAGER'], feature: FEATURES.SUPPORT },
        { name: 'Campaigns', path: '/staff/campaigns', icon: FiSend, roles: ['STAFF'], businessTypes: ['E_COMMERCE'], staffRoles: ['MARKETING', 'MANAGER'], feature: FEATURES.CAMPAIGN },
        { name: 'Documents', path: '/staff/notes', icon: FiFileText, roles: ['STAFF'] },
      ],
    },
    {
      title: 'Performance',
      items: [
        { name: 'Analytics', path: '/analytics', icon: FiPieChart, roles: ['ADMIN'] },
        { name: 'Insights', path: '/admin/advanced-analytics', icon: FiTrendingUp, roles: ['ADMIN'] },
      ],
    },
    {
      title: 'System',
      items: [
        { name: 'Configuration', path: '/admin/settings', icon: FiSettings, roles: ['ADMIN'] },
        { name: 'Help Desk', path: '/admin/support', icon: FiLifeBuoy, roles: ['ADMIN'], feature: FEATURES.SUPPORT },
        { name: 'Help Desk', path: '/staff/tickets', icon: FiLifeBuoy, roles: ['STAFF'], staffRoles: ['SUPPORT', 'MANAGER'], feature: FEATURES.SUPPORT },
      ],
    },
  ];

  const superAdminItems = [
    {
      title: 'Platform Control',
      items: [
        { name: 'Pulse', path: '/superadmin/dashboard', icon: FiActivity, roles: ['SUPER_ADMIN'] },
        { name: 'Tenants', path: '/superadmin/businesses', icon: FiShield, roles: ['SUPER_ADMIN'] },
        { name: 'Revenue', path: '/superadmin/subscriptions', icon: FiCreditCard, roles: ['SUPER_ADMIN'] },
      ],
    },
  ];

  const menuGroups = (normalizedRole === 'SUPER_ADMIN' ? superAdminItems : baseMenuGroups)
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          matchesRole(item, normalizedRole) &&
          matchesBusinessType(item, businessType) &&
          matchesStaffRole(item, staffRole) &&
          !getFeatureAccessState(user, item.feature).shouldHide
      ),
    }))
    .filter((group) => group.items.length > 0);

  const isActive = (path) => location.pathname === path;
  const sidebarWidth = isHovered ? 'md:w-72' : 'md:w-24';

  return (
    <>
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed inset-y-0 left-0 z-50 transform bg-[#001f3f] text-slate-400 transition-all duration-300 ease-in-out flex flex-col shadow-2xl border-r border-white/5 ${
          open ? 'translate-x-0 w-72' : `-translate-x-full md:translate-x-0 ${sidebarWidth}`
        }`}
      >
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

        <nav className="flex-1 overflow-y-auto px-4 py-6 no-scrollbar">
          <div className="space-y-10">
            {menuGroups.map((group) => (
              <div key={group.title} className="space-y-2">
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
                    const featureAccess = getFeatureAccessState(user, item.feature);
                    const disabled = featureAccess.shouldDisable;

                    return (
                      <Link
                        key={item.path}
                        to={disabled ? location.pathname : item.path}
                        onClick={(event) => {
                          if (disabled) {
                            event.preventDefault();
                            return;
                          }
                          onClose();
                        }}
                        aria-disabled={disabled}
                        className={`flex items-center gap-4 rounded-2xl transition-all duration-200 group relative ${
                          isHovered ? 'px-4 py-3' : 'p-4 justify-center'
                        } ${
                          disabled
                            ? 'cursor-not-allowed opacity-45'
                            : active
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                              : 'hover:bg-white/5 hover:text-white'
                        } ${
                          active
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : ''
                        }`}
                        title={disabled ? 'Your role does not allow this feature' : item.name}
                      >
                        <Icon className={`h-5 w-5 min-w-[1.25rem] ${active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} transition-colors`} />
                        {isHovered && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-sm font-bold whitespace-nowrap"
                          >
                            {item.name}
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

        <div className={`p-4 border-t border-white/5 bg-white/[0.02] transition-all duration-300 ${isHovered ? 'p-6' : 'p-4 flex flex-col items-center'}`}>
          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
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
