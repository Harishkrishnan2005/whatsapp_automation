import express from 'express';
import { submitContact } from '../controllers/contactController.js';
import {
  createPublicSubscription,
  verifyPublicPayment,
  publicRegister,
} from '../controllers/publicSubscriptionController.js';

const router = express.Router();

// Contact form
router.post('/contact', submitContact);

// Landing page signup (FREE plan)
router.post('/register', publicRegister);

// Landing page payment (paid plans)
router.post('/subscription/create', createPublicSubscription);
router.post('/subscription/verify', verifyPublicPayment);

export default router;
