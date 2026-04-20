import express from 'express';
import AuthController from '../controllers/authController.js';
import { authenticateToken, isAdmin } from '../middlewares/authorization.js';

import { checkUsageLimit } from '../middlewares/planMiddleware.js';

import validate from '../middlewares/validate.js';
import { loginSchema, registerSchema, createStaffSchema } from '../validations/auth.validation.js';

const router = express.Router();

router.post('/register-admin', validate(registerSchema), AuthController.registerAdmin);
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/superadmin/login', validate(loginSchema), AuthController.superAdminLogin);
router.post('/admin/login', validate(loginSchema), AuthController.adminLogin);
router.post('/staff/login', validate(loginSchema), AuthController.staffLogin);
router.post('/refresh', AuthController.refresh);

// Admin only
router.post('/staff', authenticateToken, isAdmin, checkUsageLimit('maxUsers'), validate(createStaffSchema), AuthController.createStaff);
router.get('/staff', authenticateToken, isAdmin, AuthController.getStaffUsers);
router.put('/staff/:id/permissions', authenticateToken, isAdmin, AuthController.updateStaffPermissions);
router.delete('/staff/:id', authenticateToken, isAdmin, AuthController.deleteStaff);

export default router;
