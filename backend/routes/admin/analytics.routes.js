import express from 'express';
import AdminAnalyticsController from '../../controllers/admin/analytics.controller.js';
import { authenticateToken } from '../../middlewares/authorization.js';
import { businessContext } from '../../middlewares/bussinessContext.js';
import { requireAdmin } from '../../middlewares/roleAccess.js';

const router = express.Router();

router.use(authenticateToken, businessContext, requireAdmin);
router.get('/overview', AdminAnalyticsController.getOverview);
router.get('/conversion', AdminAnalyticsController.getConversion);
router.get('/revenue', AdminAnalyticsController.getRevenue);
router.get('/chat', AdminAnalyticsController.getChat);

export default router;

