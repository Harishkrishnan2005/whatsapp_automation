import express from 'express';
import Business from '../models/Business.js';
import { authenticateToken } from '../middlewares/authorization.js';
import { businessContext } from '../middlewares/bussinessContext.js';

const router = express.Router();

router.use(authenticateToken);
router.use(businessContext);

router.get('/me', async (req, res) => {
  try {
    const business = await Business.findById(req.businessId).lean();
    if (!business) return res.status(404).json({ message: 'Business not found' });
    res.json(business);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
