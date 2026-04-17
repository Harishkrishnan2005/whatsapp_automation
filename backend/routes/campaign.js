import express from 'express';
import CampaignController from '../controllers/campaignController.js';
import { authenticateToken, isAdmin } from '../middlewares/authorization.js';
import { checkBusinessType } from '../middlewares/businessType.js';
import { businessContext } from '../middlewares/bussinessContext.js';
import { checkPlanFeature } from '../middlewares/planMiddleware.js';

const router = express.Router();

router.use(authenticateToken);
router.use(businessContext);
router.use(checkBusinessType('E_COMMERCE'));
router.use(isAdmin); // All campaign routes are admin-only
router.use(checkPlanFeature('allowCampaigns'));

router.post('/', CampaignController.createCampaign);
router.post('/product', CampaignController.createProductCampaign);
router.get('/', CampaignController.getCampaigns);
router.get('/:id/analytics', CampaignController.getCampaignAnalytics);

export default router;
