import express from 'express';
import QuickReplyController from '../controllers/quickReplyController.js';
import { authenticateToken } from '../middlewares/authorization.js';
import { businessContext } from '../middlewares/bussinessContext.js';

const router = express.Router();

// Get all quick replies
router.get('/', authenticateToken, businessContext, QuickReplyController.getQuickReplies);

// Create quick reply
router.post('/', authenticateToken, businessContext, QuickReplyController.createQuickReply);

// Update quick reply
router.put('/:id', authenticateToken, businessContext, QuickReplyController.updateQuickReply);

// Delete quick reply
router.delete('/:id', authenticateToken, businessContext, QuickReplyController.deleteQuickReply);

export default router;
