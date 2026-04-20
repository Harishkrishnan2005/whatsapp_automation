import express from 'express';
import AuthController from '../controllers/authController.js';
import { authenticateToken, isAdmin } from '../middlewares/authorization.js';

import { checkUsageLimit } from '../middlewares/planMiddleware.js';

const router = express.Router();

router.post('/register-admin', AuthController.registerAdmin);
router.post('/login', AuthController.login);
router.post('/superadmin/login', AuthController.superAdminLogin);
router.post('/admin/login', AuthController.adminLogin);
router.post('/staff/login', AuthController.staffLogin);
router.post('/refresh', AuthController.refresh);

// Admin only
router.post('/staff', authenticateToken, isAdmin, checkUsageLimit('maxUsers'), AuthController.createStaff);
router.get('/staff', authenticateToken, isAdmin, AuthController.getStaffUsers);
router.put('/staff/:id/permissions', authenticateToken, isAdmin, AuthController.updateStaffPermissions);
router.delete('/staff/:id', authenticateToken, isAdmin, AuthController.deleteStaff);

export default router;
