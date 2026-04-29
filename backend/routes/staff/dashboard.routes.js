import express from 'express';
import StaffDashboardController from '../../controllers/staff/dashboard.controller.js';
import { authenticateToken } from '../../middlewares/authorization.js';
import { businessContext } from '../../middlewares/bussinessContext.js';
import { requireStaff } from '../../middlewares/roleAccess.js';

const router = express.Router();

router.use(authenticateToken, businessContext, requireStaff);
router.get('/', StaffDashboardController.getDashboard);

export default router;

