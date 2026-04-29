import express from 'express';
import AdminCustomersController from '../../controllers/admin/customers.controller.js';
import { authenticateToken } from '../../middlewares/authorization.js';
import { businessContext } from '../../middlewares/bussinessContext.js';
import { requireAdmin } from '../../middlewares/roleAccess.js';

const router = express.Router();

router.use(authenticateToken, businessContext, requireAdmin);
router.get('/', AdminCustomersController.list);
router.get('/:id/orders', AdminCustomersController.getOrders);
router.get('/:id/conversations', AdminCustomersController.getConversations);
router.get('/:id', AdminCustomersController.getById);

export default router;

