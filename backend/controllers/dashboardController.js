import Customer from '../models/Customer.js';
import Message from '../models/Message.js';
import Order from '../models/Order.js';
import Campaign from '../models/Campaign.js';
import Appointment from '../models/Appointment.js';
import Product from '../models/Product.js';
import ChatAssignment from '../models/ChatAssignment.js';
import CustomerStatusService from '../services/customerStatusService.js';
import buildTenantScope from '../utils/tenantScope.js';

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
      const tenantScope = buildTenantScope(req.user.businessId);
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
        campaignPerformance,
        conversionRate,
        successRate
      ] = await Promise.all([
        this.safeQuery(() => Customer.countDocuments(tenantScope), 0, 'totalCustomers'),
        this.safeQuery(() => Message.countDocuments(tenantScope), 0, 'totalMessages'),
        this.safeQuery(() => Order.countDocuments(tenantScope), 0, 'totalOrders'),
        this.safeQuery(() => Campaign.countDocuments(tenantScope), 0, 'totalCampaigns'),
        this.safeQuery(() => Appointment.countDocuments(tenantScope), 0, 'totalAppointments'),
        this.safeQuery(() => Product.countDocuments({ ...tenantScope, isActive: true }), 0, 'totalProducts'),
        this.safeQuery(() => this.getCustomerDetails(tenantScope), { totalCustomers: 0, existingCustomers: 0, newCustomers: 0 }, 'customerDetails'),
        this.safeQuery(() => this.getMessageDetails(tenantScope), { incomingMessages: 0, outgoingMessages: 0 }, 'messageDetails'),
        this.safeQuery(() => this.getOrderDetails(tenantScope), { pendingOrders: 0, confirmedOrders: 0, deliveredOrders: 0 }, 'orderDetails'),
        this.safeQuery(() => Message.find(tenantScope).populate('customerId', 'name phone').sort({ createdAt: -1 }).limit(5).lean(), [], 'recentChats'),
        this.safeQuery(() => Order.find(tenantScope).populate('customerId', 'name phone').sort({ createdAt: -1 }).limit(5).lean(), [], 'recentOrders'),
        this.safeQuery(() => this.getCampaignPerformance(tenantScope), { totalSent: 0, totalConverted: 0, deliveryRate: '0.00', campaignConversionRate: '0.00' }, 'campaignPerformance'),
        this.safeQuery(() => this.getConversionRate(tenantScope), '0.00', 'conversionRate'),
        this.safeQuery(() => this.getSuccessRate(tenantScope), '0.00', 'successRate')
      ]);

      res.json({
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
        campaignPerformance,
        conversionRate,
        successRate
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [
        assignedChatsCount,
        todaysBookings,
        recentChats,
        recentBookings
      ] = await Promise.all([
        ChatAssignment.countDocuments({ assignedTo: userId }),
        Appointment.countDocuments({
          assignedTo: userId,
          date: { $gte: today, $lt: tomorrow }
        }),
        ChatAssignment.find({ assignedTo: userId })
          .populate('customerId', 'name')
          .sort({ updatedAt: -1 })
          .limit(5),
        Appointment.find({ assignedTo: userId })
          .populate('customerId', 'name')
          .sort({ createdAt: -1 })
          .limit(5)
      ]);

      res.json({
        assignedChatsCount,
        todaysBookings,
        recentChats,
        recentBookings
      });
    } catch (error) {
      console.error('Dashboard getStaffDashboard failed:', error);
      res.status(500).json({ message: error.message });
    }
  }

  async getCampaignPerformance() {
    const campaigns = await Campaign.find().select('sentCount totalCustomers').lean();
    const totalSent = campaigns.reduce((sum, campaign) => sum + (campaign.sentCount || 0), 0);
    const totalTargetCustomers = campaigns.reduce((sum, campaign) => sum + (campaign.totalCustomers || 0), 0);
    const totalConverted = await Order.countDocuments({
      campaignId: { $ne: null },
      status: 'Confirmed',
    });

    const deliveryRate = totalTargetCustomers > 0
      ? ((totalSent / totalTargetCustomers) * 100).toFixed(2)
      : '0.00';

    const campaignConversionRate = totalSent > 0
      ? ((totalConverted / totalSent) * 100).toFixed(2)
      : '0.00';

    return { totalSent, totalConverted, deliveryRate, campaignConversionRate };
  }

  async getConversionRate() {
    const { totalCustomers, existingCustomers } = await this.getCustomerDetails();
    return totalCustomers > 0 ? ((existingCustomers / totalCustomers) * 100).toFixed(2) : '0.00';
  }

  async getSuccessRate() {
    const campaignPerformance = await this.getCampaignPerformance();
    return campaignPerformance.campaignConversionRate;
  }

  async getCustomerDetails() {
    const customers = await Customer.find().select('_id');
    const totalCustomers = customers.length;
    const customerIds = customers.map((customer) => customer._id);
    const activityMap = await CustomerStatusService.getActivityCountMap(customerIds);

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

  async getMessageDetails() {
    const [incomingMessages, outgoingMessages] = await Promise.all([
      Message.countDocuments({ type: 'incoming' }),
      Message.countDocuments({ type: 'outgoing' }),
    ]);

    return {
      incomingMessages,
      outgoingMessages,
    };
  }

  async getOrderDetails() {
    const [pendingOrders, confirmedOrders, deliveredOrders] = await Promise.all([
      Order.countDocuments({ status: 'Pending' }),
      Order.countDocuments({ status: 'Confirmed' }),
      Order.countDocuments({
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
