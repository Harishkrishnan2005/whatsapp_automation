import Razorpay from 'razorpay';
import crypto from 'crypto';
import Subscription from '../models/Subscription.js';
import Business from '../models/Business.js';
import Usage from '../models/Usage.js';
import { PLAN_CONFIG } from '../config/plans.js';
import chatbotSeederService from '../services/chatbotSeederService.js';

let razorpayInstance = null;

const getRazorpayInstance = () => {
  if (!razorpayInstance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing in .env');
    }
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }
  return razorpayInstance;
};

export const createSubscription = async (req, res) => {
  try {
    const { plan } = req.body;
    const businessId = req.user.businessId;

    if (!PLAN_CONFIG[plan]) {
      return res.status(400).json({ message: 'Invalid plan selected' });
    }

    // Check if current business already has an active paid subscription
    const currentBusiness = await Business.findById(businessId).select('subscription');
    if (currentBusiness?.subscription?.plan !== 'FREE' && currentBusiness?.subscription?.status === 'ACTIVE') {
      return res.status(400).json({ message: 'You already have an active subscription. Only one active paid plan is allowed per email/business.' });
    }

    const planDetails = PLAN_CONFIG[plan];
    
    // Create Razorpay order
    const options = {
      amount: planDetails.price * 100, // Amount in paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`
    };

    const order = await getRazorpayInstance().orders.create(options);

    // Save PENDING subscription
    const subscription = new Subscription({
      businessId,
      plan,
      price: planDetails.price,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
      paymentStatus: 'PENDING',
      razorpayOrderId: order.id
    });

    await subscription.save();

    res.status(200).json({
      orderId: order.id,
      amount: options.amount,
      currency: options.currency,
      plan
    });
  } catch (error) {
    console.error('Subscription creation failed', error);
    res.status(500).json({ message: 'Failed to initiate subscription' });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const businessId = req.user.businessId;

    // Verify signature
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Update Subscription Record
    const subscription = await Subscription.findOneAndUpdate(
      { razorpayOrderId },
      {
        paymentStatus: 'PAID',
        razorpayPaymentId,
        razorpaySignature
      },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription record not found' });
    }

    // Update Business Plan
    await Business.findByIdAndUpdate(businessId, {
      plan: subscription.plan,
      'subscription.plan': subscription.plan,
      'subscription.status': 'ACTIVE',
      'subscription.expiryDate': subscription.endDate,
      'subscription.startDate': subscription.startDate || new Date()
    });

    await chatbotSeederService.seedFlowsForBusiness(businessId, subscription.plan);

    // Reset Usage Tracking
    await Usage.findOneAndUpdate(
      { businessId },
      {
        messagesUsed: 0,
        resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: 'Payment verified and plan activated successfully' });
  } catch (error) {
    console.error('Payment verification failed', error);
    res.status(500).json({ message: 'Payment verification failed' });
  }
};

export const getSubscriptionStatus = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const business = await Business.findById(businessId).select('subscription');
    const usage = await Usage.findOne({ businessId });

    res.status(200).json({
      plan: business.subscription.plan,
      status: business.subscription.status,
      expiryDate: business.subscription.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usage: usage || { messagesUsed: 0, flowsCreated: 0 },
      limits: PLAN_CONFIG[business.subscription.plan]
    });
  } catch (error) {
    console.error('Failed to get subscription status', error);
    res.status(500).json({ message: 'Failed to fetch subscription data' });
  }
};
