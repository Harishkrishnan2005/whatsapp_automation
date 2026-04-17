import express from 'express';
import ChatbotController from '../controllers/chatbotController.js';
import { authenticateToken, isAdmin } from '../middlewares/authorization.js';
import { businessContext } from '../middlewares/bussinessContext.js';
import { checkPlanFeature, checkUsageLimit } from '../middlewares/planMiddleware.js';

const router = express.Router();

// Get all flows
router.get('/', authenticateToken, businessContext, ChatbotController.getFlows);

// Admin only - create, update, delete flows
router.post('/', authenticateToken, businessContext, isAdmin, checkPlanFeature('allowAutomation'), checkUsageLimit('maxFlows'), ChatbotController.createFlow);
router.put('/:id', authenticateToken, businessContext, isAdmin, checkPlanFeature('allowAutomation'), ChatbotController.updateFlow);
router.delete('/:id', authenticateToken, businessContext, isAdmin, ChatbotController.deleteFlow);

// Chatbot message handler
router.post('/send', authenticateToken, businessContext, ChatbotController.sendMessage);
router.post('/message', authenticateToken, businessContext, ChatbotController.sendMessage);

export default router;
