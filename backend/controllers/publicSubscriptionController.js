import Razorpay from 'razorpay';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import Lead from '../models/Lead.js';
import Business from '../models/Business.js';
import User, { BUSINESS_TYPES } from '../models/User.js';
import { PLAN_CONFIG } from '../config/plans.js';
import chatbotSeederService from '../services/chatbotSeederService.js';
import subscriptionService from '../services/subscriptionService.js';
import seedTemplates from '../scripts/seedTemplates.js';

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
  let existingBusiness = await Business.findOne({ email });
  let existingUser = await User.findOne({ email, role: 'admin' });

  if (existingBusiness || existingUser) {
    if (!existingBusiness && existingUser?.businessId) {
      existingBusiness = await Business.findById(existingUser.businessId);
    }

    if (existingBusiness && !existingUser) {
      existingUser = await User.create({
        name: lead.businessName,
        email,
        password: lead.passwordHash,
        role: 'admin',
        permissions: ADMIN_PERMISSIONS,
        businessId: existingBusiness._id,
        tenantId: existingBusiness._id,
        businessType: normalizeBusinessType(lead.businessType),
      });
    }

    if (!existingBusiness) {
      throw new Error('An account with this email exists but is not linked to a business.');
    }

    if (existingUser && !existingUser.tenantId) {
      existingUser.tenantId = existingBusiness._id;
      await existingUser.save();
    }

    await Lead.findByIdAndUpdate(lead._id, {
      businessId: existingBusiness._id,
      userId: existingUser?._id || null,
    });

    return { businessId: existingBusiness._id, userId: existingUser?._id || null };
  }

  const businessType = normalizeBusinessType(lead.businessType);
  const business = await Business.create({
    name: lead.businessName,
    email,
    phone: lead.phone,
    status: 'active',
    plan: lead.selectedPlan,
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
    tenantId: business._id,
    businessType,
  });

  await Lead.findByIdAndUpdate(lead._id, {
    businessId: business._id,
    userId: user._id,
  });

  await chatbotSeederService.seedFlowsForBusiness(business._id, lead.selectedPlan);
  await seedTemplates(business._id);

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
    const existingBusiness = await Business.findOne({ email: normalizedEmail });
    const existingUser = await User.findOne({ email: normalizedEmail, role: 'admin' });

    if (plan === 'FREE') {
      if (existingBusiness || existingUser) {
        return res.status(200).json({
          free: true,
          message: 'Account already exists. Please sign in.',
          redirectTo: '/admin/login',
        });
      }

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
        businessId: existingBusiness?._id ? String(existingBusiness._id) : '',
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
      businessId: existingBusiness?._id || null,
      userId: existingUser?._id || null,
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
    console.log('PAYMENT BUSINESS ID:', businessId);

    await subscriptionService.handleSubscriptionPurchase(
      businessId,
      lead.selectedPlan,
      razorpayPaymentId
    );

    await chatbotSeederService.seedFlowsForBusiness(businessId, lead.selectedPlan);
    await seedTemplates(businessId);

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully.',
      redirectTo: '/admin/login',
      redirectUrl: '/admin/dashboard',
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
    const [existingBusiness, existingUser] = await Promise.all([
      Business.findOne({ email: normalizedEmail }),
      User.findOne({ email: normalizedEmail, role: 'admin' }),
    ]);
    if (existingBusiness || existingUser) {
      return res.status(200).json({ message: 'An account with this email already exists. Please sign in.', redirectTo: '/admin/login' });
    }

    const business = await Business.create({
      name: businessName,
      email: normalizedEmail,
      phone,
      status: 'active',
      plan: 'FREE',
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
      tenantId: business._id,
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

    await chatbotSeederService.seedFlowsForBusiness(business._id, 'FREE');
    await seedTemplates(business._id);

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
