import express from 'express';
import { authenticateToken, requireRole } from '../middlewares/authorization.js';
import DashboardController from '../controllers/dashboardController.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('admin'));

router.get('/dashboard', (req, res) => DashboardController.getAdminDashboard(req, res));
router.get('/me', (req, res) => res.json({ user: req.user }));

export default router;
