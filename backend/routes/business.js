import express from 'express';
import logger from '../utils/logger.js';

import Business from '../models/Business.js';
import { authenticateToken } from '../middlewares/authorization.js';
import { businessContext } from '../middlewares/bussinessContext.js';
import { resolveBusinessPlan } from '../config/plans.js';

const router = express.Router();

router.use(authenticateToken);
router.use(businessContext);

router.get('/me', async (req, res) => {

  try {
    const businessId = req.businessId;
    logger.info(`[BusinessRoute] Fetching context for ID: ${businessId}`);
    
    const business = await Business.findById(businessId).lean();
    if (!business) {
      logger.warn(`[BusinessRoute] Business NOT FOUND in DB for ID: ${businessId}`);
      return res.status(404).json({ 
        message: 'Business account not found in registry',
        id: businessId 
      });
    }
    
    res.json({
      ...business,
      plan: resolveBusinessPlan(business),
    });
  } catch (err) {
    logger.error('[BusinessRoute] Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});


export default router;
