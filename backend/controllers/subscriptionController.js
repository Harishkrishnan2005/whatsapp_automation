import crypto from 'crypto';
import subscriptionService from '../services/subscriptionService.js';
import Business from '../models/Business.js';
import Usage from '../models/Usage.js';
import { PLAN_CONFIG, getPlanPrice } from '../config/plans.js';
import Razorpay from 'razorpay';

let razorpayInstance = null;
const getRazorpayInstance = () => {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }
  return razorpayInstance;
};

/**
 * Create Razorpay Order for Subscription
 * Checks for duplicate purchases before initiating
 */
export const createSubscription = async (req, res) => {
  try {
    const { plan } = req.body;
    const businessId = req.user.businessId;
    console.log('PAYMENT BUSINESS ID:', businessId);

    if (!PLAN_CONFIG[plan]) {
      return res.status(400).json({ message: 'Invalid plan selected' });
    }

    const activeSub = await subscriptionService.getActiveSubscription(businessId);

    // SAME PLAN BLOCK
    if (activeSub.plan === plan) {
      return res.status(400).json({ message: 'Plan already active' });
    }

    // DOWNGRADE BLOCK (only check if it's not currently FREE)
    if (activeSub.plan !== 'FREE' && !subscriptionService.isUpgrade(activeSub.plan, plan)) {
      return res.status(400).json({ message: 'Downgrade allowed after expiry' });
    }

    const amount = getPlanPrice(plan);
    
    // Create Razorpay order
    const options = {
      amount: amount * 100, // paise
      currency: 'INR',
      receipt: `sub_${Date.now()}`
    };

    const order = await getRazorpayInstance().orders.create(options);

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: options.amount,
      currency: options.currency,
      plan,
      businessId,
    });
  } catch (error) {
    console.error('Subscription order creation failed', error);
    res.status(500).json({ message: error.message || 'Failed to initiate subscription' });
  }
};

/**
 * Verify Razorpay Payment and Handle Subscription Activation
 */
export const verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, plan } = req.body;
    const businessId = req.user.businessId;
    console.log('PAYMENT BUSINESS ID:', businessId);

    // Verify signature
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Handle the subscription logic (Upgrades/New Sub)
    const subscription = await subscriptionService.handleSubscriptionPurchase(
      businessId, 
      plan, 
      razorpayPaymentId
    );

    res.status(200).json({ 
      success: true,
      message: 'Payment verified and plan activated successfully',
      subscription,
      redirectUrl: '/admin/dashboard',
    });
  } catch (error) {
    console.error('Payment verification failed', error);
    res.status(500).json({ message: error.message || 'Payment verification failed' });
  }
};

/**
 * Get current subscription status and usage
 */
export const getSubscriptionStatus = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const activeSub = await subscriptionService.getActiveSubscription(businessId);
    const usage = await Usage.findOne({ businessId }) || { messagesUsed: 0, flowsUsed: 0 };

    res.status(200).json({
      plan: activeSub.plan,
      status: activeSub.status,
      expiryDate: activeSub.endDate,
      usage,
      limits: PLAN_CONFIG[activeSub.plan]
    });
  } catch (error) {
    console.error('Failed to get subscription status', error);
    res.status(500).json({ message: 'Failed to fetch subscription data' });
  }
};
