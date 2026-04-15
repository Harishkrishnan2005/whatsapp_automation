import express from 'express';
import CustomerController from '../controllers/customerController.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', CustomerController.getCustomers);
router.put('/:id/status', CustomerController.updateCustomerStatus);

export default router;