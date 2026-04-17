import Razorpay from 'razorpay';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import Lead from '../models/Lead.js';
import Business from '../models/Business.js';
import User, { BUSINESS_TYPES } from '../models/User.js';
import { PLAN_CONFIG } from '../config/plans.js';

let razorpayInstance = null;
const getRazorpay = () => {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
};

const ADMIN_PERMISSIONS = [
  'manage_customers',
  'manage_orders',
  'manage_campaigns',
  'manage_staff',
  'manage_chatbot',
  'view_analytics',
  'manage_appointments',
];

const normalizeBusinessType = (businessType) => {
  const value = String(businessType || 'E_COMMERCE').toUpperCase();
  return BUSINESS_TYPES.includes(value) ? value : 'E_COMMERCE';
};

const toCategory = (businessType) => (businessType === 'BOOKING' ? 'booking' : 'ecommerce');

const createAccountFromLead = async (lead) => {
  if (lead.businessId && lead.userId) {
    return { businessId: lead.businessId, userId: lead.userId };
  }

  if (!lead.passwordHash) {
    throw new Error('Missing signup credentials for this lead.');
  }

  const email = lead.email.toLowerCase();
  const existingBusiness = await Business.findOne({ email }).lean();
  const existingUser = await User.findOne({ email, role: 'admin' }).lean();
  if (existingBusiness || existingUser) {
    throw new Error('An account with this email already exists. Please sign in.');
  }

  const businessType = normalizeBusinessType(lead.businessType);
  const business = await Business.create({
    name: lead.businessName,
    email,
    phone: lead.phone,
    status: 'active',
    businessType,
    category: toCategory(businessType),
    subscription: {
      plan: lead.selectedPlan,
      status: 'ACTIVE',
    },
  });

  const user = await User.create({
    name: lead.businessName,
    email,
    password: lead.passwordHash,
    role: 'admin',
    permissions: ADMIN_PERMISSIONS,
    businessId: business._id,
    businessType,
  });

  await Lead.findByIdAndUpdate(lead._id, {
    businessId: business._id,
    userId: user._id,
  });

  return { businessId: business._id, userId: user._id };
};

export const createPublicSubscription = async (req, res) => {
  try {
    const { businessName, email, phone, plan, password, businessType } = req.body;

    if (!businessName || !email || !phone || !plan || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const planDetails = PLAN_CONFIG[plan];
    if (!planDetails) {
      return res.status(400).json({ message: 'Invalid plan selected.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedBusinessType = normalizeBusinessType(businessType);
    const passwordHash = await bcrypt.hash(password, 10);

    if (plan === 'FREE') {
      const lead = await Lead.create({
        businessName,
        email: normalizedEmail,
        phone,
        selectedPlan: 'FREE',
        paymentStatus: 'PAID',
        passwordHash,
        businessType: normalizedBusinessType,
      });

      await createAccountFromLead(lead);

      return res.status(200).json({
        free: true,
        message: 'Free plan activated. Redirecting to sign in...',
        redirectTo: '/admin/login',
      });
    }

    const order = await getRazorpay().orders.create({
      amount: planDetails.price * 100,
      currency: 'INR',
      receipt: `lead_${Date.now()}`,
      notes: {
        businessName,
        email: normalizedEmail,
        phone,
        plan,
        businessType: normalizedBusinessType,
      },
    });

    await Lead.create({
      businessName,
      email: normalizedEmail,
      phone,
      selectedPlan: plan,
      paymentStatus: 'PENDING',
      razorpayOrderId: order.id,
      passwordHash,
      businessType: normalizedBusinessType,
    });

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      plan,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Public subscription create error:', error);
    res.status(500).json({ message: 'Failed to initiate payment. Please try again.' });
  }
};

export const verifyPublicPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSig !== razorpaySignature) {
      return res.status(400).json({ message: 'Invalid payment signature.' });
    }

    const lead = await Lead.findOneAndUpdate(
      { razorpayOrderId },
      { paymentStatus: 'PAID', razorpayPaymentId },
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({ message: 'Lead record not found.' });
    }

    const { businessId } = await createAccountFromLead(lead);

    await Business.findByIdAndUpdate(businessId, {
      'subscription.plan': lead.selectedPlan,
      'subscription.status': 'ACTIVE',
    });

    return res.status(200).json({
      success: true,
      message: 'Payment verified. Redirecting to sign in...',
      redirectTo: '/admin/login',
    });
  } catch (error) {
    console.error('Public payment verify error:', error);
    res.status(500).json({ message: error.message || 'Payment verification failed.' });
  }
};

export const publicRegister = async (req, res) => {
  try {
    const { businessName, email, phone, password, businessType } = req.body;

    if (!businessName || !email || !phone || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedBusinessType = normalizeBusinessType(businessType);
    const existing = await Business.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const business = await Business.create({
      name: businessName,
      email: normalizedEmail,
      phone,
      status: 'active',
      businessType: normalizedBusinessType,
      category: toCategory(normalizedBusinessType),
      subscription: { plan: 'FREE', status: 'ACTIVE' },
    });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: businessName,
      email: normalizedEmail,
      password: hashedPassword,
      role: 'admin',
      permissions: ADMIN_PERMISSIONS,
      businessId: business._id,
      businessType: normalizedBusinessType,
    });

    await Lead.create({
      businessName,
      email: normalizedEmail,
      phone,
      selectedPlan: 'FREE',
      paymentStatus: 'PAID',
      passwordHash: hashedPassword,
      businessType: normalizedBusinessType,
      businessId: business._id,
      userId: user._id,
    });

    return res.status(201).json({
      message: 'Account created successfully! Please sign in.',
      redirectTo: '/admin/login',
    });
  } catch (error) {
    console.error('Public register error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
};
