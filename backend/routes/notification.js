import express from 'express';
import NotificationController from '../controllers/notificationController.js';
import { authenticateToken } from '../middlewares/authorization.js';
import { businessContext } from '../middlewares/bussinessContext.js';

const router = express.Router();

// Get user notifications
router.get('/', authenticateToken, businessContext, NotificationController.getUserNotifications);

// Get unread count
router.get('/unread/count', authenticateToken, businessContext, NotificationController.getUnreadCount);

// Mark as read
router.put('/:id/read', authenticateToken, businessContext, NotificationController.markAsRead);

// Mark all as read
router.put('/all/read', authenticateToken, businessContext, NotificationController.markAllAsRead);

// Delete notification
router.delete('/:id', authenticateToken, businessContext, NotificationController.deleteNotification);

export default router;
