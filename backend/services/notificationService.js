import Notification from '../models/Notification.js';

class NotificationService {
  // Get notifications for user
  async getUserNotifications(userId, limit = 20) {
    return await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    return await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );
  }

  // Mark all notifications as read
  async markAllAsRead(userId) {
    return await Notification.updateMany(
      { userId },
      { isRead: true }
    );
  }

  // Get unread count
  async getUnreadCount(userId) {
    return await Notification.countDocuments({ userId, isRead: false });
  }

  // Send notification
  async sendNotification(userId, type, message, relatedId) {
    return await Notification.create({
      userId,
      type,
      message,
      relatedId,
    });
  }

  // Delete notification
  async deleteNotification(notificationId) {
    return await Notification.findByIdAndDelete(notificationId);
  }

  // Broadcast notification to multiple users
  async broadcastNotification(userIds, type, message, relatedId) {
    const notifications = userIds.map(userId => ({
      userId,
      type,
      message,
      relatedId,
    }));
    return await Notification.insertMany(notifications);
  }
}

export default new NotificationService();