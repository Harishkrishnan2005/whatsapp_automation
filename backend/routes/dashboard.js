import express from 'express';
import DashboardController from '../controllers/dashboardController.js';
import { authenticateToken, isAdmin } from '../middlewares/authorization.js';

const router = express.Router();

// Admin dashboard
router.get('/admin', authenticateToken, isAdmin, (req, res) => DashboardController.getAdminDashboard(req, res));

// Staff dashboard
router.get('/staff', authenticateToken, (req, res) => DashboardController.getStaffDashboard(req, res));

export default router;
