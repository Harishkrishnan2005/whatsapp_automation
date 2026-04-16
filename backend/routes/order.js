import express from 'express';
import OrderController from '../controllers/orderController.js';
import { authenticateToken, isAdmin } from '../middlewares/authorization.js';
import { checkBusinessType } from '../middlewares/businessType.js';
import { businessContext } from '../middlewares/bussinessContext.js';

const router = express.Router();

router.use(authenticateToken);
router.use(businessContext);
router.use(checkBusinessType('E_COMMERCE'));

router.get('/', OrderController.getOrders);
router.post('/', OrderController.createOrder);
router.post('/verify-payment', OrderController.verifyPayment);
router.post('/:id/cancel', OrderController.cancelOrder);
router.post('/:id/return-request', OrderController.requestReturn);
router.post('/:id/approve-return', isAdmin, OrderController.approveReturn);

// Backward-compatible admin update routes
router.put('/:id/status', OrderController.updateOrderStatus);
router.put('/:id/payment-status', OrderController.updatePaymentStatus);
router.put('/:id/assign', isAdmin, OrderController.assignOrder);

export default router;
