import express from 'express';
import QuickReplyController from '../controllers/quickReplyController.js';
import { authenticateToken } from '../middlewares/authorization.js';

const router = express.Router();

// Get all quick replies
router.get('/', authenticateToken, QuickReplyController.getQuickReplies);

// Create quick reply
router.post('/', authenticateToken, QuickReplyController.createQuickReply);

// Update quick reply
router.put('/:id', authenticateToken, QuickReplyController.updateQuickReply);

// Delete quick reply
router.delete('/:id', authenticateToken, QuickReplyController.deleteQuickReply);

export default router;