import express from 'express';
import DashboardController from '../controllers/dashboardController.js';
import { createSubscription, getSubscriptionStatus, verifyPayment } from '../controllers/subscriptionController.js';
import { authenticateToken, requireRole } from '../middlewares/authorization.js';
import { businessContext } from '../middlewares/bussinessContext.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('admin'));
router.use(businessContext);

router.get('/dashboard', (req, res) => DashboardController.getAdminDashboard(req, res));
router.get('/subscription/status', getSubscriptionStatus);
router.post('/subscription/create', createSubscription);
router.post('/subscription/verify', verifyPayment);

export default router;
