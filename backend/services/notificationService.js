import Notification from '../models/Notification.js';

class NotificationService {
  // Get notifications for user
  async getUserNotifications(businessId, userId, limit = 20) {
    if (!businessId || !userId) {
      return [];
    }
    return await Notification.find({ userId, businessId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  // Mark notification as read
  async markAsRead(businessId, notificationId) {
    if (!businessId || !notificationId) {
      return null;
    }
    return await Notification.findOneAndUpdate(
      { _id: notificationId, businessId },
      { isRead: true },
      { new: true }
    );
  }

  // Mark all notifications as read
  async markAllAsRead(businessId, userId) {
    if (!businessId || !userId) {
      return { acknowledged: true, modifiedCount: 0 };
    }
    return await Notification.updateMany(
      { userId, businessId },
      { isRead: true }
    );
  }

  // Get unread count
  async getUnreadCount(businessId, userId) {
    if (!businessId || !userId) {
      return 0;
    }
    return await Notification.countDocuments({ userId, businessId, isRead: false });
  }

  // Send notification
  async sendNotification(businessId, userId, type, message, relatedId) {
    return await Notification.create({
      userId,
      type,
      message,
      relatedId,
      businessId,
    });
  }

  // Delete notification
  async deleteNotification(businessId, notificationId) {
    if (!businessId || !notificationId) {
      return null;
    }
    return await Notification.findOneAndDelete({ _id: notificationId, businessId });
  }

  // Broadcast notification to multiple users
  async broadcastNotification(businessId, userIds, type, message, relatedId) {
    const notifications = userIds.map(userId => ({
      userId,
      type,
      message,
      relatedId,
      businessId,
    }));
    return await Notification.insertMany(notifications);
  }
}

export default new NotificationService();
