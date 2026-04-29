import express from 'express';
import AdminDashboardController from '../../controllers/admin/dashboard.controller.js';
import { authenticateToken } from '../../middlewares/authorization.js';
import { businessContext } from '../../middlewares/bussinessContext.js';
import { requireAdmin } from '../../middlewares/roleAccess.js';

const router = express.Router();

router.use(authenticateToken, businessContext, requireAdmin);
router.get('/', AdminDashboardController.getDashboard);

export default router;

