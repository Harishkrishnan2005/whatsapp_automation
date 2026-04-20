import Business from '../models/Business.js';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Subscription from '../models/Subscription.js';
import { PLAN_CONFIG } from '../config/plans.js';
import logger from '../utils/logger.js';

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

      // Advanced Subscription Analytics
      const [analytics] = await Subscription.aggregate([
        {
          $facet: {
            totalRevenue: [
              { $match: { paymentStatus: 'PAID' } },
              { $group: { _id: null, total: { $sum: '$price' } } }
            ],
            mrr: [
              { $match: { paymentStatus: 'PAID', status: 'ACTIVE' } },
              { $group: { _id: null, total: { $sum: '$price' } } }
            ],
            planWise: [
              {
                $group: {
                  _id: '$plan',
                  activeBusinesses: { $addToSet: '$businessId' },
                  revenue: { 
                    $sum: { 
                      $cond: [{ $eq: ['$paymentStatus', 'PAID'] }, '$price', 0] 
                    } 
                  }
                }
              },
              {
                $project: {
                  plan: '$_id',
                  activeBusinesses: { $size: '$activeBusinesses' },
                  revenue: 1
                }
              }
            ]
          }
        }
      ]);

      const subscriptions = await Business.aggregate([
        {
          $group: {
            _id: '$subscription.plan',
            count: { $sum: 1 },
          },
        },
      ]);

      logger.debug('[SuperAdmin] Dashboard Analytics:', analytics);

      return res.json({
        totalBusinesses,
        totalCustomers,
        totalOrders,
        totalAdmins,
        totalStaff,
        subscriptions,
        totalRevenue: analytics?.totalRevenue[0]?.total || 0,
        mrr: analytics?.mrr[0]?.total || 0,
        planWiseStats: analytics?.planWise || []
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

      const activePlans = plans.map((plan) => {
        const expiryDate = plan.latestExpiry;
        let daysRemaining = null;

        if (expiryDate) {
          const diffTime = new Date(expiryDate) - new Date();
          daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        }

        return {
          plan: plan._id || 'FREE',
          businessCount: plan.totalBusinesses,
          expiryDate: expiryDate,
          daysRemaining: daysRemaining,
          revenue: revenueMap.get((plan._id || 'FREE').toUpperCase()) || 0,
          monthlyPrice: PLAN_CONFIG[plan._id]?.price || 0,
        };
      });

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