import express from 'express';
import AdminOrdersController from '../../controllers/admin/orders.controller.js';
import { authenticateToken } from '../../middlewares/authorization.js';
import { businessContext } from '../../middlewares/bussinessContext.js';
import { requireAdmin } from '../../middlewares/roleAccess.js';
import { checkBusinessType } from '../../middlewares/businessType.js';

const router = express.Router();

router.use(authenticateToken, businessContext, requireAdmin, checkBusinessType('E_COMMERCE'));
router.get('/metrics/summary', AdminOrdersController.getMetricsSummary);
router.get('/', AdminOrdersController.list);
router.post('/', AdminOrdersController.create);
router.get('/:id', AdminOrdersController.getById);
router.put('/:id/status', AdminOrdersController.updateStatus);
router.put('/:id/payment', AdminOrdersController.updatePayment);

export default router;

