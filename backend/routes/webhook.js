import express from 'express';
import WebhookController from '../controllers/webhookController.js';

const router = express.Router();

router.post('/', (req, res) => WebhookController.handleWebhook(req, res));
router.post('/payment/verify', (req, res) => WebhookController.verifyRazorpayPayment(req, res));
router.post('/razorpay', express.raw({ type: 'application/json' }), (req, res) => WebhookController.handleRazorpayWebhook(req, res));

export default router;
