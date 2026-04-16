import express from 'express';
import AppointmentController from '../controllers/appointmentController.js';
import { authenticateToken, isAdmin } from '../middlewares/authorization.js';
import { checkBusinessType } from '../middlewares/businessType.js';
import { businessContext } from '../middlewares/bussinessContext.js';

const router = express.Router();
router.use(authenticateToken);
router.use(businessContext);
router.use(checkBusinessType('BOOKING'));

// Create appointment
router.post('/', AppointmentController.createAppointment);

// Get appointments (paginated) - admin sees all, staff sees assigned
router.get('/', AppointmentController.getAppointments);

// Get customer appointments
router.get('/customer/:customerId', AppointmentController.getCustomerAppointments);

// Update appointment status - admin can update any, staff only assigned
router.put('/:id/status', AppointmentController.updateAppointmentStatus);

// Assign appointment to staff - admin only
router.put('/:id/assign', isAdmin, AppointmentController.assignAppointment);

export default router;
