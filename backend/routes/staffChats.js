import express from 'express';
import ChatAssignmentController from '../controllers/chatAssignmentController.js';
import { authenticateToken } from '../middlewares/authorization.js';
import { checkBusinessType } from '../middlewares/businessType.js';
import { businessContext } from '../middlewares/bussinessContext.js';

const router = express.Router();

router.get(
  '/',
  authenticateToken,
  businessContext,
  checkBusinessType(['E_COMMERCE', 'BOOKING']),
  ChatAssignmentController.getAssignedChats
);

export default router;
