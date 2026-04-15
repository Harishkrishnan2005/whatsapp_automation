import express from 'express';
import ChatAssignmentController from '../controllers/chatAssignmentController.js';
import { authenticateToken, isAdmin } from '../middlewares/authorization.js';

const router = express.Router();

// Get all active chats - admin only
router.get('/', authenticateToken, isAdmin, ChatAssignmentController.getAllActiveChats);

// Get all active chats - admin only
router.get('/all', authenticateToken, isAdmin, ChatAssignmentController.getAllActiveChats);

// Get chat history by customer
router.get('/history/:customerId', authenticateToken, ChatAssignmentController.getChatHistory);

// Transfer chat - admin only
router.put('/:id/transfer', authenticateToken, isAdmin, ChatAssignmentController.transferChat);

// Close chat
router.put('/:id/close', authenticateToken, ChatAssignmentController.closeChat);

// Admin take over - admin only
router.put('/:id/takeover', authenticateToken, isAdmin, ChatAssignmentController.takeOverChat);

// Get assigned chats for staff
router.get('/:staffId', authenticateToken, ChatAssignmentController.getAssignedChats);

// Assign chat - admin only
router.post('/', authenticateToken, isAdmin, ChatAssignmentController.assignChat);

export default router;