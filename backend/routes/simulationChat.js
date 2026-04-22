import express from 'express';
import ChatController from '../controllers/chatController.js';
import { authenticateToken } from '../middlewares/authorization.js';
import { businessContext } from '../middlewares/bussinessContext.js';

const router = express.Router();

router.use(authenticateToken);
router.use(businessContext);

// Matches user specification
router.get('/', ChatController.getAllChatsForSimulation);
router.get('/:id/messages', ChatController.getMessagesForSimulation);
router.post('/send', ChatController.sendMessageForSimulation);

export default router;
