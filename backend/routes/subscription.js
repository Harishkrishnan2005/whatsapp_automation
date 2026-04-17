import express from 'express';
import { createSubscription, verifyPayment, getSubscriptionStatus } from '../controllers/subscriptionController.js';
import { authenticateToken } from '../middlewares/authorization.js';

const router = express.Router();

router.post('/create', authenticateToken, createSubscription);
router.post('/verify', authenticateToken, verifyPayment);
router.get('/status', authenticateToken, getSubscriptionStatus);

export default router;
