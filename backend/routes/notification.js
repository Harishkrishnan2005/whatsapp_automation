import express from 'express';
import NotificationController from '../controllers/notificationController.js';
import { authenticateToken } from '../middlewares/authorization.js';

const router = express.Router();

// Get user notifications
router.get('/', authenticateToken, NotificationController.getUserNotifications);

// Get unread count
router.get('/unread/count', authenticateToken, NotificationController.getUnreadCount);

// Mark as read
router.put('/:id/read', authenticateToken, NotificationController.markAsRead);

// Mark all as read
router.put('/all/read', authenticateToken, NotificationController.markAllAsRead);

// Delete notification
router.delete('/:id', authenticateToken, NotificationController.deleteNotification);

export default router;