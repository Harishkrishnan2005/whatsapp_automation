import express from 'express';
import AdminChatbotController from '../../controllers/admin/chatbot.controller.js';
import { authenticateToken } from '../../middlewares/authorization.js';
import { businessContext } from '../../middlewares/bussinessContext.js';
import { requireAdmin } from '../../middlewares/roleAccess.js';
import { checkFlowLimit } from '../../middlewares/planMiddleware.js';

const router = express.Router();

router.use(authenticateToken, businessContext, requireAdmin);
router.get('/flows', AdminChatbotController.listFlows);
router.post('/flows', checkFlowLimit, AdminChatbotController.createFlow);
router.get('/flows/:id/steps', AdminChatbotController.getFlowSteps);
router.get('/flows/:id', AdminChatbotController.getFlow);
router.put('/flows/:id', AdminChatbotController.updateFlow);
router.delete('/flows/:id', AdminChatbotController.deleteFlow);

export default router;

