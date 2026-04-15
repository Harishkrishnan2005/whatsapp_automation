import express from 'express';
import { authenticateToken, requireRole } from '../middlewares/authorization.js';
import SuperAdminController from '../controllers/superAdminController.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('super_admin'));

router.get('/dashboard', SuperAdminController.getDashboard);
router.get('/businesses', SuperAdminController.getBusinesses);
router.get('/subscriptions', SuperAdminController.getSubscriptions);

export default router;
