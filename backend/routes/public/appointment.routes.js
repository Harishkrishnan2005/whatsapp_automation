import express from 'express';
import PublicAppointmentController from '../../controllers/public/appointment.controller.js';
import { allowPublicBusinessType, publicBusinessContext } from '../../middlewares/publicBusinessContext.js';

const router = express.Router();

router.use(publicBusinessContext, allowPublicBusinessType('BOOKING'));
router.post('/book', PublicAppointmentController.book);
router.post('/confirm', PublicAppointmentController.confirm);

export default router;

