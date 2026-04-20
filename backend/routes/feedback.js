import express from 'express';
import FeedbackController from '../controllers/feedbackController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { businessContext } from '../middlewares/bussinessContext.js';

const router = express.Router();

router.use(authenticateToken);
router.use(businessContext);

router.get('/', FeedbackController.getFeedback);
router.post('/', FeedbackController.createFeedback);

export default router;
