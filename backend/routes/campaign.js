import express from 'express';
import CampaignController from '../controllers/campaignController.js';
import { authenticateToken, isAdmin } from '../middlewares/authorization.js';

const router = express.Router();

router.use(authenticateToken);
router.use(isAdmin); // All campaign routes are admin-only

router.post('/', CampaignController.createCampaign);
router.post('/product', CampaignController.createProductCampaign);
router.get('/', CampaignController.getCampaigns);
router.get('/:id/analytics', CampaignController.getCampaignAnalytics);

export default router;