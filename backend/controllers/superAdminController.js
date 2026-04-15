import Business from '../models/Business.js';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';

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
            _id: '$plan',
            count: { $sum: 1 },
          },
        },
      ]);

      return res.json({
        totalBusinesses,
        totalCustomers,
        totalOrders,
        totalAdmins,
        totalStaff,
        subscriptions,
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
        .select('name email plan businessType createdAt updatedAt')
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
            _id: '$plan',
            totalBusinesses: { $sum: 1 },
            latest: { $max: '$updatedAt' },
          },
        },
        { $sort: { totalBusinesses: -1 } },
      ]);

      const activePlans = plans.map((plan) => ({
        plan: plan._id,
        businessCount: plan.totalBusinesses,
        lastUpdated: plan.latest,
      }));

      return res.json({ subscriptions: activePlans });
    } catch (error) {
      console.error('[SuperAdmin] getSubscriptions error:', error);
      return res.status(500).json({ message: error.message });
    }
  }
}

export default new SuperAdminController();