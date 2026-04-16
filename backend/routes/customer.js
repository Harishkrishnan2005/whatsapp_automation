import express from 'express';
import CustomerController from '../controllers/customerController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { businessContext } from '../middlewares/bussinessContext.js';

const router = express.Router();

router.use(authenticateToken);
router.use(businessContext);

router.get('/', CustomerController.getCustomers);
router.put('/:id/status', CustomerController.updateCustomerStatus);

export default router;
