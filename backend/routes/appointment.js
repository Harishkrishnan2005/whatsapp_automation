import express from 'express';
import AppointmentController from '../controllers/appointmentController.js';
import { authenticateToken, isAdmin } from '../middlewares/authorization.js';

const router = express.Router();

// Create appointment
router.post('/', authenticateToken, AppointmentController.createAppointment);

// Get appointments (paginated) - admin sees all, staff sees assigned
router.get('/', authenticateToken, AppointmentController.getAppointments);

// Get customer appointments
router.get('/customer/:customerId', authenticateToken, AppointmentController.getCustomerAppointments);

// Update appointment status - admin can update any, staff only assigned
router.put('/:id/status', authenticateToken, AppointmentController.updateAppointmentStatus);

// Assign appointment to staff - admin only
router.put('/:id/assign', authenticateToken, isAdmin, AppointmentController.assignAppointment);

export default router;