import NotificationService from '../services/notificationService.js';

class NotificationController {
  async getUserNotifications(req, res) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 20;
      const notifications = await NotificationService.getUserNotifications(userId, limit);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const notification = await NotificationService.markAsRead(id);
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;
      await NotificationService.markAllAsRead(userId);
      res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      const count = await NotificationService.getUnreadCount(userId);
      res.json({ unreadCount: count });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async deleteNotification(req, res) {
    try {
      const { id } = req.params;
      await NotificationService.deleteNotification(id);
      res.json({ message: 'Notification deleted' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new NotificationController();