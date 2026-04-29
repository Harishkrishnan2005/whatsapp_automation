import express from 'express';
import FeedbackController from '../controllers/feedbackController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { businessContext } from '../middlewares/bussinessContext.js';
import { requireFeedbackAccess } from '../middlewares/staffRbac.js';
import { isAdmin } from '../middlewares/authorization.js';

const router = express.Router();

router.use(authenticateToken);
router.use(businessContext);
router.use(requireFeedbackAccess);

router.get('/', FeedbackController.getFeedback);
router.post('/', FeedbackController.createFeedback);
router.put('/:id/assign', isAdmin, FeedbackController.assignFeedback);
router.post('/:id/respond', FeedbackController.respond);

export default router;
