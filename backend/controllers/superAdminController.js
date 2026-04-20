import Business from '../models/Business.js';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Subscription from '../models/Subscription.js';
import { PLAN_CONFIG } from '../config/plans.js';

class SuperAdminController {
  async getDashboard(req, res) {
    try {
      const [totalBusinesses, totalCustomers, totalOrders, totalAdmins, totalStaff] = await Promise.all([
        Business.countDocuments(),
        Customer.countDocuments(),
        Order.countDocuments(),
        User.countDocuments({ role: 'admin' }),
        User.countDocuments({ role: 'staff' }),
      ]);

      const subscriptions = await Business.aggregate([
        {
          $group: {
            _id: '$subscription.plan',
            count: { $sum: 1 },
          },
        },
      ]);

      const [revenueData] = await Subscription.aggregate([
        { $match: { paymentStatus: 'PAID' } },
        { $group: { _id: null, total: { $sum: { $toDouble: '$price' } } } }
      ]);

      return res.json({
        totalBusinesses,
        totalCustomers,
        totalOrders,
        totalAdmins,
        totalStaff,
        subscriptions,
        totalRevenue: revenueData?.total || 0,
      });
    } catch (error) {
      console.error('[SuperAdmin] getDashboard error:', error);
      return res.status(500).json({ message: error.message });
    }
  }

  async getBusinesses(req, res) {
    try {
      const businesses = await Business.find()
        .sort({ createdAt: -1 })
        .select('name email subscription businessType createdAt updatedAt')
        .lean();

      return res.json({ businesses });
    } catch (error) {
      console.error('[SuperAdmin] getBusinesses error:', error);
      return res.status(500).json({ message: error.message });
    }
  }

  async getSubscriptions(req, res) {
    try {
      const plans = await Business.aggregate([
        {
          $group: {
            _id: '$subscription.plan',
            totalBusinesses: { $sum: 1 },
            latestExpiry: { $max: '$subscription.expiryDate' },
          },
        },
        { $sort: { totalBusinesses: -1 } },
      ]);

      const planRevenue = await Subscription.aggregate([
        { $match: { paymentStatus: 'PAID' } },
        {
          $group: {
            _id: { $toUpper: { $trim: { input: '$plan' } } },
            total: { $sum: { $toDouble: '$price' } },
          },
        },
      ]);

      const revenueMap = new Map(planRevenue.map(p => [p._id, p.total]));

      const activePlans = plans.map((plan) => ({
        plan: plan._id,
        businessCount: plan.totalBusinesses,
        expiryDate: plan.latestExpiry,
        revenue: revenueMap.get(plan._id) || 0,
        monthlyPrice: PLAN_CONFIG[plan._id]?.price || 0,
      }));

      return res.json({ subscriptions: activePlans });
    } catch (error) {
      console.error('[SuperAdmin] getSubscriptions error:', error);
      return res.status(500).json({ message: error.message });
    }
  }

  async updateBusinessSubscription(req, res) {
    try {
      const { businessId, plan, startDate, expiryDate } = req.body;

      if (!businessId || !plan) {
        return res.status(400).json({ message: 'businessId and plan are required' });
      }

      const business = await Business.findById(businessId);
      if (!business) {
        return res.status(404).json({ message: 'Business not found' });
      }

      const updateData = {
        'subscription.plan': plan,
        'subscription.status': 'ACTIVE',
        'subscription.startDate': startDate ? new Date(startDate) : new Date(),
        'subscription.expiryDate': expiryDate ? new Date(expiryDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      const updatedBusiness = await Business.findByIdAndUpdate(
        businessId,
        { $set: updateData },
        { new: true }
      );

      const planPrice = PLAN_CONFIG[plan]?.price || 0;

      // Create a historical subscription record
      await Subscription.create({
        businessId,
        plan,
        price: planPrice,
        startDate: updateData['subscription.startDate'],
        endDate: updateData['subscription.expiryDate'],
        paymentStatus: 'PAID',
        razorpayOrderId: `MANUAL_${Date.now()}`
      });

      return res.json({ 
        message: 'Subscription updated successfully', 
        business: updatedBusiness 
      });
    } catch (error) {
      console.error('[SuperAdmin] updateBusinessSubscription error:', error);
      return res.status(500).json({ message: error.message });
    }
  }
}

export default new SuperAdminController();