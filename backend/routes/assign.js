import express from 'express';
import ChatAssignmentController from '../controllers/chatAssignmentController.js';
import { authenticateToken, isAdmin } from '../middlewares/authorization.js';
import { checkBusinessType } from '../middlewares/businessType.js';

const router = express.Router();

router.post('/', authenticateToken, checkBusinessType(['E_COMMERCE', 'BOOKING']), isAdmin, ChatAssignmentController.assignChat);

export default router;
