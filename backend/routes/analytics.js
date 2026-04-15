import express from 'express';
import AnalyticsController from '../controllers/analyticsController.js';
import { authenticateToken, isAdmin } from '../middlewares/authorization.js';

const router = express.Router();

// Basic analytics
router.get('/', authenticateToken, AnalyticsController.getAnalytics);

// Advanced analytics - admin only
router.get('/advanced', authenticateToken, isAdmin, AnalyticsController.getAdvancedAnalytics);

// Dashboard analytics - admin only
router.get('/dashboard', authenticateToken, isAdmin, AnalyticsController.getDashboardAnalytics);

// Campaign performance - admin only
router.get('/campaigns/performance', authenticateToken, isAdmin, AnalyticsController.getCampaignPerformance);

// Customer engagement - admin only
router.get('/customers/engagement', authenticateToken, isAdmin, AnalyticsController.getCustomerEngagement);

export default router;