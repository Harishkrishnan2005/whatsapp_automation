import express from 'express';
import AdminConversationsController from '../../controllers/admin/conversations.controller.js';
import { authenticateToken } from '../../middlewares/authorization.js';
import { businessContext } from '../../middlewares/bussinessContext.js';
import { requireAdmin } from '../../middlewares/roleAccess.js';

const router = express.Router();

router.use(authenticateToken, businessContext, requireAdmin);
router.get('/', AdminConversationsController.list);
router.get('/:id/messages', AdminConversationsController.getMessages);
router.post('/:id/messages', AdminConversationsController.sendMessage);
router.get('/:id', AdminConversationsController.getById);

export default router;

