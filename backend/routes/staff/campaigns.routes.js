import express from 'express';
import Campaign from '../../models/Campaign.js';
import { authenticateToken } from '../../middlewares/authorization.js';
import { businessContext } from '../../middlewares/bussinessContext.js';
import { requireStaff } from '../../middlewares/roleAccess.js';
import { requireMarketingAccess } from '../../middlewares/staffRbac.js';
import { checkBusinessType } from '../../middlewares/businessType.js';
import buildTenantScope from '../../utils/tenantScope.js';

const router = express.Router();

router.use(authenticateToken, businessContext, requireStaff, requireMarketingAccess, checkBusinessType('E_COMMERCE'));

router.get('/', async (req, res) => {
  try {
    const campaigns = await Campaign.find(buildTenantScope(req.businessId))
      .sort({ createdAt: -1 })
      .lean();
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
