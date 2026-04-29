import express from 'express';
import StaffConversationsController from '../../controllers/staff/conversations.controller.js';
import { authenticateToken } from '../../middlewares/authorization.js';
import { businessContext } from '../../middlewares/bussinessContext.js';
import { requireStaff } from '../../middlewares/roleAccess.js';

const router = express.Router();

router.use(authenticateToken, businessContext, requireStaff);
router.get('/', StaffConversationsController.list);
router.get('/:id/messages', StaffConversationsController.getMessages);
router.post('/:id/messages', StaffConversationsController.sendMessage);
router.get('/:id', StaffConversationsController.getById);

export default router;

