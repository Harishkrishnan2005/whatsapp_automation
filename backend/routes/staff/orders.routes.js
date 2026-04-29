import express from 'express';
import StaffOrdersController from '../../controllers/staff/orders.controller.js';
import { authenticateToken } from '../../middlewares/authorization.js';
import { businessContext } from '../../middlewares/bussinessContext.js';
import { requireStaff } from '../../middlewares/roleAccess.js';
import { checkBusinessType } from '../../middlewares/businessType.js';

const router = express.Router();

router.use(authenticateToken, businessContext, requireStaff, checkBusinessType('E_COMMERCE'));
router.get('/', StaffOrdersController.list);
router.get('/:id', StaffOrdersController.getById);

export default router;

