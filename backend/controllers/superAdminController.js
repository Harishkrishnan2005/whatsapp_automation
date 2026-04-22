import Business from '../models/Business.js';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Subscription from '../models/Subscription.js';
import Usage from '../models/Usage.js';
import ChatbotFlow from '../models/ChatbotFlow.js';
import { PLAN_CONFIG } from '../config/plans.js';
import logger from '../utils/logger.js';
import chatbotSeederService from '../services/chatbotSeederService.js';

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

      // Refactored Multi-Tenant Ledger Analytics
      // 1. Calculate Platform Total Revenue (Unified: Subscriptions + Merchant GMV)
      const [subscriptionRevenueData, merchantGMVData] = await Promise.all([
        Subscription.aggregate([
          { $match: { paymentStatus: 'PAID' } },
          { $group: { _id: null, total: { $sum: '$price' } } }
        ]),
        Order.aggregate([
          { $match: { paymentStatus: { $in: ['Paid', 'Received'] } } },
          { $group: { _id: null, total: { $sum: '$finalPrice' } } }
        ])
      ]);

      // Calculate MRR from currently active plans of businesses
      const activePaidBusinesses = await Business.find({
        'subscription.status': 'ACTIVE',
        'subscription.plan': { $ne: 'FREE' }
      }).select('subscription.plan');

      const mrr = activePaidBusinesses.reduce((acc, bus) => {
        const planPrice = PLAN_CONFIG[bus.subscription.plan]?.price || 0;
        return acc + planPrice;
      }, 0);

      // Fallback: If no historical sub records but active plans exist, use MRR as initial yield
      let subRevenue = subscriptionRevenueData[0]?.total || 0;
      if (subRevenue === 0 && mrr > 0) {
        subRevenue = mrr;
      }

      const merchantGMV = merchantGMVData[0]?.total || 0;
      const totalRevenue = subRevenue + merchantGMV;

      // 3. Plan-Wise Stats Distribution
      const currentActiveStats = await Business.aggregate([
        { $match: { 'subscription.status': 'ACTIVE' } },
        { $group: { _id: '$subscription.plan', count: { $sum: 1 } } }
      ]);

      const historicalPlanRevenue = await Subscription.aggregate([
        { $match: { paymentStatus: 'PAID' } },
        { $group: { _id: '$plan', total: { $sum: '$price' } } }
      ]);

      const planRevenueMap = new Map(historicalPlanRevenue.map(r => [r._id, r.total]));
      const activeCountMap = new Map(currentActiveStats.map(s => [s._id, s.count]));

      const planWiseStats = Object.keys(PLAN_CONFIG)
        .filter(plan => plan !== 'FREE')
        .map(plan => ({
          plan,
          activeBusinesses: activeCountMap.get(plan) || 0,
          revenue: planRevenueMap.get(plan) || 0
        }));

      // 4. Monthly Unified Revenue Trend (Subscriptions + GMV)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      sixMonthsAgo.setHours(0, 0, 0, 0);

      const [subTrend, orderTrend] = await Promise.all([
        Subscription.aggregate([
          { $match: { paymentStatus: 'PAID', createdAt: { $gte: sixMonthsAgo } } },
          { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, total: { $sum: '$price' } } }
        ]),
        Order.aggregate([
          { $match: { paymentStatus: { $in: ['Paid', 'Received'] }, createdAt: { $gte: sixMonthsAgo } } },
          { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, total: { $sum: '$finalPrice' } } }
        ])
      ]);

      const combinedTrends = new Map();
      const combinedCounts = new Map();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      [...subTrend, ...orderTrend].forEach(item => {
        const key = `${item._id.year}-${item._id.month}`;
        combinedTrends.set(key, (combinedTrends.get(key) || 0) + item.total);
      });

      subTrend.forEach(item => {
        const key = `${item._id.year}-${item._id.month}`;
        // Note: For simplicity we assume item.count was added in aggregate. 
        // Let's refine the subTrend aggregation to include count.
      });

      // Refining aggregations to include counts
      const [subTrendExtended, orderTrendExtended] = await Promise.all([
        Subscription.aggregate([
          { $match: { paymentStatus: 'PAID', createdAt: { $gte: sixMonthsAgo } } },
          { 
            $group: { 
              _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, 
              total: { $sum: '$price' },
              uniqueBusinesses: { $addToSet: '$businessId' }
            } 
          },
          { $project: { total: 1, count: { $size: '$uniqueBusinesses' } } }
        ]),
        Order.aggregate([
          { $match: { paymentStatus: { $in: ['Paid', 'Received'] }, createdAt: { $gte: sixMonthsAgo } } },
          { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, total: { $sum: '$finalPrice' } } }
        ])
      ]);

      const trendsMap = new Map();
      const countsMap = new Map();

      subTrendExtended.forEach(item => {
        const key = `${item._id.year}-${item._id.month}`;
        trendsMap.set(key, (trendsMap.get(key) || 0) + item.total);
        countsMap.set(key, (countsMap.get(key) || 0) + item.count);
      });

      orderTrendExtended.forEach(item => {
        const key = `${item._id.year}-${item._id.month}`;
        trendsMap.set(key, (trendsMap.get(key) || 0) + item.total);
      });

      const revenueTrend = Array.from({ length: 6 }).map((_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        const month = d.getMonth() + 1;
        const year = d.getFullYear();
        const key = `${year}-${month}`;
        let value = trendsMap.get(key) || 0;
        let count = countsMap.get(key) || 0;

        const today = new Date();
        if (month === (today.getMonth() + 1) && year === today.getFullYear()) {
          if (value === 0 && mrr > 0) value = subRevenue;
          if (count === 0 && activePaidBusinesses.length > 0) count = activePaidBusinesses.length;
        }

        return {
          name: monthNames[month - 1],
          value,
          count
        };
      });

      logger.debug('[SuperAdmin] Dashboard Unified Analytics:', { totalRevenue, mrr, merchantGMV, subRevenue, activePaidCount: activePaidBusinesses.length });

      return res.json({
        totalBusinesses,
        totalCustomers,
        totalOrders,
        totalAdmins,
        totalStaff,
        totalRevenue,
        merchantGMV,
        subRevenue,
        mrr,
        activePaidCount: activePaidBusinesses.length,
        planWiseStats,
        revenueTrend
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
        .lean();

      const enrichedBusinesses = await Promise.all(businesses.map(async (business) => {
        const [staffCount, flowCount, usage] = await Promise.all([
          User.countDocuments({ businessId: business._id, role: 'staff' }),
          ChatbotFlow.countDocuments({ businessId: business._id, isDeleted: { $ne: true } }),
          Usage.findOne({ businessId: business._id }).lean()
        ]);

        const plan = business.subscription?.plan || 'FREE';
        const limits = PLAN_CONFIG[plan];

        return {
          ...business,
          staffCount,
          flowCount,
          messagesUsed: usage?.messagesUsed || 0,
          maxMessages: limits.maxMessages
        };
      }));

      return res.json({ businesses: enrichedBusinesses });
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
        // Fallback: If no explicit expiry recorded, show next 30 days as current cycle
        const expiryDate = plan.latestExpiry || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
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
        plan,
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

      await chatbotSeederService.seedFlowsForBusiness(businessId, plan);

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
