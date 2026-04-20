import express from 'express';
import ChatController from '../controllers/chatController.js';
import { authenticateToken } from '../middlewares/authorization.js';
import { businessContext } from '../middlewares/bussinessContext.js';

const router = express.Router();

router.use(authenticateToken);
router.use(businessContext);

// Matches user specification
router.get('/', ChatController.getAllChatsForSimulation);
router.get('/:id', ChatController.getMessagesForSimulation); // We'll add this to controller
router.post('/send', ChatController.sendMessageForSimulation); // We'll add this to controller

export default router;
