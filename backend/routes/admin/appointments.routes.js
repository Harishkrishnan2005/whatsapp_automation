import express from 'express';
import AdminAppointmentsController from '../../controllers/admin/appointments.controller.js';
import { authenticateToken } from '../../middlewares/authorization.js';
import { businessContext } from '../../middlewares/bussinessContext.js';
import { requireAdmin } from '../../middlewares/roleAccess.js';
import { checkBusinessType } from '../../middlewares/businessType.js';

const router = express.Router();

router.use(authenticateToken, businessContext, requireAdmin, checkBusinessType('BOOKING'));
router.get('/', AdminAppointmentsController.list);
router.post('/', AdminAppointmentsController.create);
router.get('/:id/notes', AdminAppointmentsController.getNotes);
router.post('/:id/notes', AdminAppointmentsController.addNote);
router.get('/:id/audit', AdminAppointmentsController.getAudit);
router.put('/:id/assign', AdminAppointmentsController.assign);
router.get('/:id', AdminAppointmentsController.getById);

export default router;

