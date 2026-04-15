import express from 'express';
import ChatAssignmentController from '../controllers/chatAssignmentController.js';
import { authenticateToken, isAdmin } from '../middlewares/authorization.js';

const router = express.Router();

router.post('/', authenticateToken, isAdmin, ChatAssignmentController.assignChat);

export default router;
