import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiMenu, FiSmartphone } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const Navbar = ({ onToggleSidebar }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-950 to-blue-900 text-white shadow-lg">
      <div className="max-w-full px-6 h-20 flex items-center">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="md:hidden p-2 rounded-lg bg-blue-800/80 hover:bg-blue-700 transition text-white"
            >
              <FiMenu className="w-6 h-6" />
            </button>
            <div className="flex items-center space-x-3">
              <FiSmartphone className="h-7 w-7" />
              <div>
                <h1 className="text-xl font-bold">WhatsApp Automation</h1>
                <p className="text-blue-200 text-xs">Platform</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-blue-800 rounded-full transition"
                aria-label="Notifications"
              >
                <FiBell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white text-gray-800 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                  <div className="p-4 border-b border-gray-200 font-semibold">
                    Notifications ({unreadCount} unread)
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No notifications</div>
                  ) : (
                    <div>
                      {notifications.map((notif) => (
                        <div
                          key={notif._id}
                          className={`p-3 border-b border-gray-100 hover:bg-gray-50 ${
                            !notif.isRead ? 'bg-blue-50' : ''
                          }`}
                        >
                          <p className="font-medium text-sm">{notif.title}</p>
                          <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notif.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition font-semibold text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
