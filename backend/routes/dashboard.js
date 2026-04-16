import express from 'express';
import DashboardController from '../controllers/dashboardController.js';
import { authenticateToken, requireRole } from '../middlewares/authorization.js';
import { businessContext } from '../middlewares/bussinessContext.js';

const router = express.Router();

// Admin dashboard
router.get('/admin', authenticateToken, businessContext, requireRole('admin'), (req, res) => DashboardController.getAdminDashboard(req, res));

// Staff dashboard
router.get('/staff', authenticateToken, businessContext, requireRole('staff'), (req, res) => DashboardController.getStaffDashboard(req, res));

export default router;
