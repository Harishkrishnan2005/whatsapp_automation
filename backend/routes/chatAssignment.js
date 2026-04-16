import express from 'express';
import ChatAssignmentController from '../controllers/chatAssignmentController.js';
import { authenticateToken, isAdmin } from '../middlewares/authorization.js';
import { checkBusinessType } from '../middlewares/businessType.js';
import { businessContext } from '../middlewares/bussinessContext.js';

const router = express.Router();
router.use(authenticateToken);
router.use(businessContext);
router.use(checkBusinessType('E_COMMERCE'));

// Get all active chats - admin only
router.get('/', isAdmin, ChatAssignmentController.getAllActiveChats);

// Get all active chats - admin only
router.get('/all', isAdmin, ChatAssignmentController.getAllActiveChats);

// Get chat history by customer
router.get('/history/:customerId', ChatAssignmentController.getChatHistory);

// Transfer chat - admin only
router.put('/:id/transfer', isAdmin, ChatAssignmentController.transferChat);

// Close chat
router.put('/:id/close', ChatAssignmentController.closeChat);

// Admin take over - admin only
router.put('/:id/takeover', isAdmin, ChatAssignmentController.takeOverChat);

// Get assigned chats for staff
router.get('/:staffId', ChatAssignmentController.getAssignedChats);

// Assign chat - admin only
router.post('/', isAdmin, ChatAssignmentController.assignChat);

export default router;
