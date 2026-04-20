import express from 'express';
import AnalyticsController from '../controllers/analyticsController.js';
import { authenticateToken, isAdmin } from '../middlewares/authorization.js';
import { businessContext } from '../middlewares/bussinessContext.js';

import { checkPlanFeature } from '../middlewares/planMiddleware.js';

const router = express.Router();

// Basic analytics
router.get('/', authenticateToken, businessContext, AnalyticsController.getAnalytics);

// Advanced analytics - admin only
router.get('/advanced', authenticateToken, businessContext, isAdmin, checkPlanFeature('allowAdvancedAnalytics'), AnalyticsController.getAdvancedAnalytics);

// Dashboard analytics - admin only
router.get('/dashboard', authenticateToken, businessContext, isAdmin, AnalyticsController.getDashboardAnalytics);

// Campaign performance - admin only
router.get('/campaigns/performance', authenticateToken, businessContext, isAdmin, AnalyticsController.getCampaignPerformance);

// Customer engagement - admin only
router.get('/customers/engagement', authenticateToken, businessContext, isAdmin, AnalyticsController.getCustomerEngagement);

export default router;
