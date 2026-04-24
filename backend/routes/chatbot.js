import express from 'express';
import ChatbotController from '../controllers/chatbotController.js';
import { authenticateToken, isAdmin } from '../middlewares/authorization.js';
import { businessContext } from '../middlewares/bussinessContext.js';
import { checkFlowLimit } from '../middlewares/planMiddleware.js';

const router = express.Router();

// Get all flows (Admin only)
router.get('/', authenticateToken, businessContext, isAdmin, ChatbotController.getFlows);

// Admin only - create, update, delete flows
router.post('/', authenticateToken, businessContext, isAdmin, checkFlowLimit, ChatbotController.createFlow);
router.put('/:id', authenticateToken, businessContext, isAdmin, ChatbotController.updateFlow);
router.delete('/:id', authenticateToken, businessContext, isAdmin, ChatbotController.deleteFlow);


router.get('/history', authenticateToken, businessContext, ChatbotController.getChatHistory);
router.post('/send', authenticateToken, businessContext, ChatbotController.sendMessage);
router.post('/message', authenticateToken, businessContext, ChatbotController.sendMessage);
router.post('/seed', authenticateToken, businessContext, isAdmin, ChatbotController.seedFlows);

export default router;
