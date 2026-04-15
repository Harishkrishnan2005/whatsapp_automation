import express from 'express';
import ChatAssignmentController from '../controllers/chatAssignmentController.js';
import { authenticateToken } from '../middlewares/authorization.js';

const router = express.Router();

router.get('/', authenticateToken, ChatAssignmentController.getAssignedChats);

export default router;
