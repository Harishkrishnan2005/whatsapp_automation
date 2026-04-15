import express from 'express';
import DashboardController from '../controllers/dashboardController.js';
import { authenticateToken, requireRole } from '../middlewares/authorization.js';

const router = express.Router();

// Admin dashboard
router.get('/admin', authenticateToken, requireRole('admin'), (req, res) => DashboardController.getAdminDashboard(req, res));

// Staff dashboard
router.get('/staff', authenticateToken, requireRole('staff'), (req, res) => DashboardController.getStaffDashboard(req, res));

export default router;
