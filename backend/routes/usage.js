import express from 'express';
import usageController from '../controllers/usageController.js';
import { authenticateToken } from '../middlewares/authorization.js';
import { businessContext } from '../middlewares/bussinessContext.js';

const router = express.Router();

router.use(authenticateToken);
router.use(businessContext);

router.get('/', usageController.getUsage);

export default router;
