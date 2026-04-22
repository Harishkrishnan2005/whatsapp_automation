import express from 'express';
import ChatController from '../controllers/chatController.js';
import { authenticateToken } from '../middlewares/authorization.js';
import { checkBusinessType } from '../middlewares/businessType.js';
import { businessContext } from '../middlewares/bussinessContext.js';

const router = express.Router();
router.use(authenticateToken);
router.use(businessContext);
router.use(checkBusinessType(['E_COMMERCE', 'BOOKING']));

// GET all chats (customers) with last message
router.get('/', ChatController.getAllChats);

// SEARCH customers by name or phone
router.get('/search', ChatController.searchCustomers);

// GET customer details with stats
router.get('/:customerId', ChatController.getCustomerDetails);

// GET all messages for a customer
router.get('/:customerId/messages', ChatController.getMessages);

// POST send message from admin/staff
router.post('/messages', ChatController.sendMessage);

// PUT mark messages as read
router.put('/:customerId/read', ChatController.markMessagesAsRead);

export default router;
