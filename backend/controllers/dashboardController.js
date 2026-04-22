import Customer from '../models/Customer.js';
import Message from '../models/Message.js';
import Order from '../models/Order.js';
import Campaign from '../models/Campaign.js';
import Appointment from '../models/Appointment.js';
import Product from '../models/Product.js';
import ChatAssignment from '../models/ChatAssignment.js';
import CustomerStatusService from '../services/customerStatusService.js';
import buildTenantScope from '../utils/tenantScope.js';
import AnalyticsService from '../services/analyticsService.js';
import Business from '../models/Business.js';

class DashboardController {
  async safeQuery(fn, fallbackValue, label) {
    try {
      return await fn();
    } catch (error) {
      console.error(`Dashboard query failed (${label}):`, error.message);
      return fallbackValue;
    }
  }

  // Admin Dashboard
  async getAdminDashboard(req, res) {
    try {
      const business = await this.safeQuery(() => Business.findById(req.businessId).select('category').lean(), { category: 'ecommerce' }, 'businessInfo');
      const category = business?.category || 'ecommerce';
      const tenantScope = buildTenantScope(req.businessId);

      const [
        totalCustomers,
        totalMessages,
        totalOrders,
        totalCampaigns,
        totalAppointments,
        totalProducts,
        customerDetails,
        messageDetails,
        orderDetails,
        recentChats,
        recentOrders,
        recentBookings,
        campaignPerformance,
        conversionRate,
        successRate,
        analyticsSummary
      ] = await Promise.all([
        this.safeQuery(() => Customer.countDocuments(tenantScope), 0, 'totalCustomers'),
        this.safeQuery(() => Message.countDocuments(tenantScope), 0, 'totalMessages'),
        this.safeQuery(() => Order.countDocuments(tenantScope), 0, 'totalOrders'),
        this.safeQuery(() => Campaign.countDocuments(tenantScope), 0, 'totalCampaigns'),
        this.safeQuery(() => Appointment.countDocuments(tenantScope), 0, 'totalAppointments'),
        this.safeQuery(() => Product.countDocuments({ ...tenantScope, isActive: true }), 0, 'totalProducts'),
        this.safeQuery(() => this.getCustomerDetails(tenantScope, req.businessId, category), { totalCustomers: 0, existingCustomers: 0, newCustomers: 0 }, 'customerDetails'),
        this.safeQuery(() => this.getMessageDetails(tenantScope), { incomingMessages: 0, outgoingMessages: 0 }, 'messageDetails'),
        this.safeQuery(() => this.getOrderDetails(tenantScope), { pendingOrders: 0, confirmedOrders: 0, deliveredOrders: 0 }, 'orderDetails'),
        this.safeQuery(() => Message.find(tenantScope).populate('customerId', 'name phone').sort({ createdAt: -1 }).limit(5).lean(), [], 'recentChats'),
        this.safeQuery(() => Order.find(tenantScope).populate('customerId', 'name phone').sort({ createdAt: -1 }).limit(5).lean(), [], 'recentOrders'),
        this.safeQuery(() => Appointment.find(tenantScope).populate('customerId', 'name phone').sort({ createdAt: -1 }).limit(5).lean(), [], 'recentBookings'),
        this.safeQuery(() => this.getCampaignPerformance(tenantScope, category), { totalSent: 0, totalConverted: 0, deliveryRate: '0.00', campaignConversionRate: '0.00' }, 'campaignPerformance'),
        this.safeQuery(() => this.getConversionRate(tenantScope, req.businessId, category), '0.00', 'conversionRate'),
        this.safeQuery(() => this.getSuccessRate(tenantScope, category), '0.00', 'successRate'),
        this.safeQuery(() => AnalyticsService.getDashboardAnalytics(req.businessId), null, 'analyticsSummary')
      ]);

      res.json({
        category,
        totalCustomers,
        totalMessages,
        totalOrders,
        totalCampaigns,
        totalAppointments,
        totalProducts,
        customerDetails,
        messageDetails,
        orderDetails,
        recentChats,
        recentOrders,
        recentBookings,
        campaignPerformance,
        conversionRate,
        successRate,
        ...analyticsSummary // Spreading the detailed analytics summary (funnel, trends, etc.)
      });
    } catch (error) {
      console.error('Dashboard getAdminDashboard failed:', error);
      res.status(500).json({ message: error.message });
    }
  }

  // Staff Dashboard
  async getStaffDashboard(req, res) {
    try {
      const userId = req.user.id;
      const tenantScope = buildTenantScope(req.businessId);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      const [
        totalAssigned,
        todaysBookings,
        upcomingBookings,
        completedBookings,
        recentChats,
        recentBookings
      ] = await Promise.all([
        // Total Assigned
        Appointment.countDocuments({ assignedTo: userId, ...tenantScope }),
        // Today
        Appointment.countDocuments({
          ...tenantScope,
          assignedTo: userId,
          date: { $gte: todayStart, $lt: todayEnd }
        }),
        // Upcoming (Future dates or today later, status not cancelled/completed)
        Appointment.countDocuments({
          ...tenantScope,
          assignedTo: userId,
          date: { $gte: todayStart },
          status: { $in: ['BOOKED', 'CONFIRMED', 'RESCHEDULED', 'PENDING'] }
        }),
        // Completed
        Appointment.countDocuments({
          ...tenantScope,
          assignedTo: userId,
          status: 'COMPLETED'
        }),
        // Recent chats (from ChatAssignment)
        ChatAssignment.find({ assignedTo: userId, ...tenantScope })
          .populate('customerId', 'name')
          .sort({ updatedAt: -1 })
          .limit(5),
        // Recent bookings
        Appointment.find({ assignedTo: userId, ...tenantScope })
          .populate('customerId', 'name')
          .sort({ date: 1 })
          .limit(5)
      ]);

      res.json({
        totalAssigned,
        todaysBookings,
        upcomingBookings,
        completedBookings,
        recentChats,
        recentBookings
      });
    } catch (error) {
      console.error('Dashboard getStaffDashboard failed:', error);
      res.status(500).json({ message: error.message });
    }
  }

  async getCampaignPerformance(tenantScope, category = 'ecommerce') {
    const campaigns = await Campaign.find(tenantScope).select('sentCount totalCustomers').lean();
    const totalSent = campaigns.reduce((sum, campaign) => sum + (campaign.sentCount || 0), 0);
    const totalTargetCustomers = campaigns.reduce((sum, campaign) => sum + (campaign.totalCustomers || 0), 0);
    
    let totalConverted = 0;
    if (category === 'booking') {
      totalConverted = await Appointment.countDocuments({
        ...tenantScope,
        campaignId: { $ne: null },
        status: 'Confirmed',
      });
    } else {
      totalConverted = await Order.countDocuments({
        ...tenantScope,
        campaignId: { $ne: null },
        status: 'Confirmed',
      });
    }

    const deliveryRate = totalTargetCustomers > 0
      ? ((totalSent / totalTargetCustomers) * 100).toFixed(2)
      : '0.00';

    const campaignConversionRate = totalSent > 0
      ? ((totalConverted / totalSent) * 100).toFixed(2)
      : '0.00';

    return { totalSent, totalConverted, deliveryRate, campaignConversionRate };
  }

  async getConversionRate(tenantScope, businessId, category = 'ecommerce') {
    const { totalCustomers, existingCustomers } = await this.getCustomerDetails(tenantScope, businessId, category);
    return totalCustomers > 0 ? ((existingCustomers / totalCustomers) * 100).toFixed(2) : '0.00';
  }

  async getSuccessRate(tenantScope, category = 'ecommerce') {
    const campaignPerformance = await this.getCampaignPerformance(tenantScope, category);
    return campaignPerformance.campaignConversionRate;
  }

  async getCustomerDetails(tenantScope, businessId, category = 'ecommerce') {
    const customers = await Customer.find(tenantScope).select('_id');
    const totalCustomers = customers.length;
    const customerIds = customers.map((customer) => customer._id);
    const activityMap = await CustomerStatusService.getActivityCountMap(customerIds, businessId, category);

    let existingCustomers = 0;
    for (const customerId of customerIds) {
      if ((activityMap.get(customerId.toString()) || 0) > 1) {
        existingCustomers += 1;
      }
    }

    return {
      totalCustomers,
      existingCustomers,
      newCustomers: totalCustomers - existingCustomers,
    };
  }

  async getMessageDetails(tenantScope) {
    const [incomingMessages, outgoingMessages] = await Promise.all([
      Message.countDocuments({ ...tenantScope, type: 'incoming' }),
      Message.countDocuments({ ...tenantScope, type: 'outgoing' }),
    ]);

    return {
      incomingMessages,
      outgoingMessages,
    };
  }

  async getOrderDetails(tenantScope) {
    const [pendingOrders, confirmedOrders, deliveredOrders] = await Promise.all([
      Order.countDocuments({ ...tenantScope, status: 'Pending' }),
      Order.countDocuments({ ...tenantScope, status: 'Confirmed' }),
      Order.countDocuments({
        ...tenantScope,
        $or: [{ orderStatus: 'Delivered' }, { status: 'Delivered' }],
      }),
    ]);

    return {
      pendingOrders,
      confirmedOrders,
      deliveredOrders,
    };
  }
}

export default new DashboardController();
