import express from 'express';
import AdminBillingController from '../../controllers/admin/billing.controller.js';
import { authenticateToken } from '../../middlewares/authorization.js';
import { businessContext } from '../../middlewares/bussinessContext.js';
import { requireAdmin } from '../../middlewares/roleAccess.js';

const router = express.Router();

router.use(authenticateToken, businessContext, requireAdmin);
router.get('/dashboard', AdminBillingController.getDashboard);
router.get('/invoices', AdminBillingController.getInvoices);
router.get('/subscription', AdminBillingController.getSubscription);
router.post('/subscription', AdminBillingController.createSubscription);
router.post('/subscription/verify', AdminBillingController.verifySubscription);

// Backward-compatible adapters
router.get('/subscription/status', AdminBillingController.getSubscription);
router.post('/subscription/create', AdminBillingController.createSubscription);
router.post('/subscription/verify', AdminBillingController.verifySubscription);

export default router;

