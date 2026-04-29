import express from 'express';
import AdminStaffController from '../../controllers/admin/staff.controller.js';
import { authenticateToken } from '../../middlewares/authorization.js';
import { requireAdmin } from '../../middlewares/roleAccess.js';
import { checkUsageLimit } from '../../middlewares/planMiddleware.js';
import validate from '../../middlewares/validate.js';
import { createStaffSchema, updateStaffSchema } from '../../validations/auth.validation.js';

const router = express.Router();

router.use(authenticateToken, requireAdmin);
router.get('/', AdminStaffController.list);
router.post('/', checkUsageLimit('maxUsers'), validate(createStaffSchema), AdminStaffController.create);
router.get('/:id/assignments', AdminStaffController.getAssignments);
router.get('/:id', AdminStaffController.getById);
router.put('/:id', validate(updateStaffSchema), AdminStaffController.update);
router.delete('/:id', AdminStaffController.remove);

export default router;

