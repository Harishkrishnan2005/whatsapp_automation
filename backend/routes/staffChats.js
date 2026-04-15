import express from 'express';
import ChatAssignmentController from '../controllers/chatAssignmentController.js';
import { authenticateToken } from '../middlewares/authorization.js';
import { checkBusinessType } from '../middlewares/businessType.js';

const router = express.Router();

router.get('/', authenticateToken, checkBusinessType('E_COMMERCE'), ChatAssignmentController.getAssignedChats);

export default router;
