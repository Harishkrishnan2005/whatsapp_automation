import express from 'express';
import ChatbotController from '../controllers/chatbotController.js';
import { authenticateToken, isAdmin } from '../middlewares/authorization.js';

const router = express.Router();

// Get all flows
router.get('/', authenticateToken, ChatbotController.getFlows);

// Admin only - create, update, delete flows
router.post('/', authenticateToken, isAdmin, ChatbotController.createFlow);
router.put('/:id', authenticateToken, isAdmin, ChatbotController.updateFlow);
router.delete('/:id', authenticateToken, isAdmin, ChatbotController.deleteFlow);

export default router;