import express from 'express';
import PublicOrderController from '../../controllers/public/order.controller.js';
import { allowPublicBusinessType, publicBusinessContext } from '../../middlewares/publicBusinessContext.js';

const router = express.Router();

router.use(publicBusinessContext, allowPublicBusinessType('E_COMMERCE'));
router.post('/create', PublicOrderController.create);
router.post('/confirm', PublicOrderController.confirm);
router.post('/payment', PublicOrderController.payment);

export default router;

