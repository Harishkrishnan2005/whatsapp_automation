import { useState, useEffect } from 'react';
import { FiBell, FiX } from 'react-icons/fi';
import api from '../utils/api';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const interval = setInterval(fetchNotifications, 5000);
    fetchNotifications();
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);

      const unreadRes = await api.get('/notifications/unread/count');
      setUnreadCount(unreadRes.data.unreadCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`, {});
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      fetchNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/all/read', {});
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2"
      >
        <FiBell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded shadow-lg z-50">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-500 hover:text-blue-700"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No notifications</div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`p-3 border-b flex justify-between items-start ${
                    !notif.isRead ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{notif.type}</div>
                    <div className="text-sm">{notif.message}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(notif.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!notif.isRead) markAsRead(notif._id);
                      else deleteNotification(notif._id);
                    }}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
