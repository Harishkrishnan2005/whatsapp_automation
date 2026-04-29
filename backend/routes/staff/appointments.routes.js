import express from 'express';
import StaffAppointmentsController from '../../controllers/staff/appointments.controller.js';
import { authenticateToken } from '../../middlewares/authorization.js';
import { businessContext } from '../../middlewares/bussinessContext.js';
import { requireStaff } from '../../middlewares/roleAccess.js';
import { checkBusinessType } from '../../middlewares/businessType.js';

const router = express.Router();

router.use(authenticateToken, businessContext, requireStaff, checkBusinessType('BOOKING'));
router.get('/', StaffAppointmentsController.list);
router.get('/:id/notes', StaffAppointmentsController.getNotes);
router.post('/:id/notes', StaffAppointmentsController.addNote);
router.put('/:id/status', StaffAppointmentsController.updateStatus);
router.get('/:id', StaffAppointmentsController.getById);

export default router;

