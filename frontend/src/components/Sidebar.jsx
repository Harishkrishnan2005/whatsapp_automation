import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
} from 'react-icons/fi';

const Sidebar = ({ open, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const businessType = user?.businessType || 'E_COMMERCE';

  const commonMenuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FiGrid },
  ];

  const adminMenuItems =
    businessType === 'BOOKING'
      ? [
          { path: '/chat', label: 'Chat Simulator', icon: FiMessageCircle },
          { path: '/customers', label: 'Customers', icon: FiUsers },
          { path: '/admin/appointments', label: 'Appointments', icon: FiCalendar },
          { path: '/admin/chatbot', label: 'Chatbot', icon: FiMessageCircle },
          { path: '/analytics', label: 'Analytics', icon: FiBarChart2 },
          { path: '/admin/staff', label: 'Staff', icon: FiUserCheck },
          { path: '/admin/advanced-analytics', label: 'Advanced Analytics', icon: FiTrendingUp },
        ]
      : [
          { path: '/chat', label: 'Chat Simulator', icon: FiMessageCircle },
          { path: '/customers', label: 'Customers', icon: FiUsers },
          { path: '/orders', label: 'Orders', icon: FiShoppingCart },
          { path: '/campaigns', label: 'Campaigns', icon: FiSend },
          { path: '/products', label: 'Products', icon: FiPackage },
          { path: '/admin/chat-management', label: 'Chat Management', icon: FiClipboard },
          { path: '/analytics', label: 'Analytics', icon: FiBarChart2 },
          { path: '/admin/chatbot', label: 'Chatbot', icon: FiMessageCircle },
          { path: '/admin/staff', label: 'Staff', icon: FiUserCheck },
          { path: '/admin/advanced-analytics', label: 'Advanced Analytics', icon: FiTrendingUp },
        ];

  const staffMenuItems =
    businessType === 'BOOKING'
      ? [
          { path: '/staff/chat', label: 'My Chats', icon: FiMessageCircle },
          { path: '/staff/bookings', label: 'My Appointments', icon: FiCalendar },
          { path: '/staff/notes', label: 'Customer Notes', icon: FiFileText },
        ]
      : [
          { path: '/staff/chat', label: 'My Chats', icon: FiMessageCircle },
          { path: '/staff/orders', label: 'My Orders', icon: FiShoppingCart },
          { path: '/staff/notes', label: 'Customer Notes', icon: FiFileText },
        ];

  const superAdminMenuItems = [
    { path: '/superadmin/dashboard', label: 'Dashboard', icon: FiGrid },
    { path: '/superadmin/businesses', label: 'Businesses', icon: FiUsers },
    { path: '/superadmin/subscriptions', label: 'Subscriptions', icon: FiTrendingUp },
  ];

  const menuItems = [
    ...commonMenuItems,
    ...(user?.role === 'super_admin' ? superAdminMenuItems : user?.role === 'admin' ? adminMenuItems : staffMenuItems),
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <div
        className={`surface-sidebar fixed inset-y-0 left-0 z-50 w-72 transform overflow-hidden no-scrollbar flex flex-col border-r shadow-soft transition-transform duration-300 md:fixed md:top-20 md:bottom-0 md:w-64 md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-surface p-5 md:hidden">
          <div className="text-sm font-semibold tracking-wide text-secondary">Menu</div>
          <button onClick={onClose} className="btn-ghost p-2">
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="hidden border-b border-surface p-5 md:block">
          <div className="space-y-2">
            <p className="text-xl font-semibold sidebar-logo">
              {user?.role === 'super_admin' ? 'Platform' : 'Business'}
            </p>
            <p className="text-sm sidebar-section-title">
              {user?.role === 'super_admin' ? 'Management dashboard' : 'Analytics dashboard'}
            </p>
          </div>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto no-scrollbar py-4 px-3 md:px-0">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`sidebar-link mx-2 mb-2 ${isActive(item.path) ? 'sidebar-link-active' : ''}`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm md:text-[15px]">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-surface p-4">
          <button onClick={handleLogout} className="sidebar-logout">
            Logout
          </button>
        </div>
      </div>

      {open && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onClose} />}
    </>
  );
};

export default Sidebar;
