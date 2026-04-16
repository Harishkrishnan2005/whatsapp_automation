import Customer from '../models/Customer.js';
import Message from '../models/Message.js';
import Order from '../models/Order.js';
import Appointment from '../models/Appointment.js';
import Campaign from '../models/Campaign.js';
import Product from '../models/Product.js';
import ChatAssignment from '../models/ChatAssignment.js';
import CustomerStatusService from './customerStatusService.js';
import buildTenantScope from '../utils/tenantScope.js';

class AnalyticsService {
  async getCustomerStatusTotals(businessId) {
    const tenantScope = buildTenantScope(businessId);
    const customers = await Customer.find(tenantScope).select('_id');
    const totalCustomers = customers.length;
    const customerIds = customers.map((customer) => customer._id);
    const activityMap = await CustomerStatusService.getActivityCountMap(customerIds, businessId);

    let existingCustomers = 0;
    for (const customerId of customerIds) {
      const activityCount = activityMap.get(customerId.toString()) || 0;
      if (activityCount > 1) {
        existingCustomers += 1;
      }
    }

    const newCustomers = totalCustomers - existingCustomers;
    return {
      totalCustomers,
      newCustomers,
      existingCustomers,
    };
  }

  async getAnalytics(businessId) {
    const tenantScope = buildTenantScope(businessId);
    const { totalCustomers, existingCustomers } = await this.getCustomerStatusTotals(businessId);
    const totalMessages = await Message.countDocuments(tenantScope);
    const totalOrders = await Order.countDocuments(tenantScope);
    const totalProducts = await Product.countDocuments({ ...tenantScope, isActive: true });
    const conversionRate = totalCustomers > 0 ? (existingCustomers / totalCustomers) * 100 : 0;

    return {
      totalCustomers,
      totalMessages,
      totalOrders,
      totalProducts,
      conversionRate: conversionRate.toFixed(2),
    };
  }

  // Advanced analytics
  async getAdvancedAnalytics(businessId) {
    const tenantScope = buildTenantScope(businessId);
    const { totalCustomers, newCustomers, existingCustomers } = await this.getCustomerStatusTotals(businessId);

    const totalMessages = await Message.countDocuments(tenantScope);
    const incomingMessages = await Message.countDocuments({ ...tenantScope, type: 'incoming' });
    const outgoingMessages = await Message.countDocuments({ ...tenantScope, type: 'outgoing' });

    const totalOrders = await Order.countDocuments(tenantScope);
    const pendingOrders = await Order.countDocuments({ ...tenantScope, status: 'Pending' });
    const confirmedOrders = await Order.countDocuments({ ...tenantScope, status: 'Confirmed' });

    // Revenue (mock calculation)
    const estimatedRevenue = totalOrders * 50; // Assuming avg order value is $50

    return {
      customers: {
        total: totalCustomers,
        new: newCustomers,
        existing: existingCustomers,
        conversionRate: totalCustomers > 0 ? ((existingCustomers / totalCustomers) * 100).toFixed(2) : 0,
      },
      messages: {
        total: totalMessages,
        incoming: incomingMessages,
        outgoing: outgoingMessages,
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        confirmed: confirmedOrders,
      },
      revenue: {
        estimated: estimatedRevenue,
      },
    };
  }

  // Campaign performance
  async getCampaignPerformance(businessId) {
    const tenantScope = buildTenantScope(businessId);
    const campaigns = await Campaign.find(tenantScope);
    const performance = [];
    const totalCustomers = await Customer.countDocuments(tenantScope);

    for (const campaign of campaigns) {
      const messagesSent = await Message.countDocuments({
        ...tenantScope,
        message: campaign.message,
        type: 'outgoing',
      });
      performance.push({
        campaignId: campaign._id,
        message: campaign.message,
        messagesSent,
        successRate: ((messagesSent / Math.max(1, totalCustomers)) * 100).toFixed(2),
        sentAt: campaign.sentAt,
      });
    }

    return performance;
  }

  // Customer engagement
  async getCustomerEngagement(businessId) {
    const tenantScope = buildTenantScope(businessId);
    const customers = await Customer.find(tenantScope);
    const engagement = [];

    for (const customer of customers) {
      const messageCount = await Message.countDocuments({ customerId: customer._id, ...tenantScope });
      const orderCount = await Order.countDocuments({ customerId: customer._id, ...tenantScope });
      const appointmentCount = await Appointment.countDocuments({ customerId: customer._id, ...tenantScope });
      const status = CustomerStatusService.getStatusByActivityCount(orderCount + appointmentCount);

      engagement.push({
        customerId: customer._id,
        name: customer.name,
        phone: customer.phone,
        messages: messageCount,
        orders: orderCount,
        status,
      });
    }

    return engagement;
  }

  // Comprehensive dashboard analytics
  async getDashboardAnalytics(businessId) {
    try {
      const tenantScope = buildTenantScope(businessId);
      // Get customer stats
      const { totalCustomers, newCustomers, existingCustomers } = await this.getCustomerStatusTotals(businessId);

      // Get message stats
      const totalMessages = await Message.countDocuments(tenantScope);
      const incomingMessages = await Message.countDocuments({ ...tenantScope, type: 'incoming' });
      const outgoingMessages = await Message.countDocuments({ ...tenantScope, type: 'outgoing' });

      // Get appointment stats
      const totalAppointments = await Appointment.countDocuments(tenantScope);
      const pendingAppointments = await Appointment.countDocuments({ ...tenantScope, status: 'Pending' });
      const confirmedAppointments = await Appointment.countDocuments({ ...tenantScope, status: 'Confirmed' });

      // Get order stats
      const totalOrders = await Order.countDocuments(tenantScope);
      
      // Calculate product ordered conversion rate (success/failure)
      const successfulOrders = await Order.countDocuments({ ...tenantScope, paymentStatus: 'Received' });
      const failedOrders = await Order.countDocuments({ ...tenantScope, paymentStatus: { $in: ['Pending', 'Refund'] } });
      const orderSuccessRate = totalOrders > 0 ? ((successfulOrders / totalOrders) * 100).toFixed(2) : 0;
      const orderFailureRate = totalOrders > 0 ? ((failedOrders / totalOrders) * 100).toFixed(2) : 0;

      // Calculate actual revenue (sum of finalPrice of successful orders)
      const revenueData = await Order.aggregate([
        { $match: { ...tenantScope, paymentStatus: 'Received' } },
        { $group: { _id: null, totalRevenue: { $sum: '$finalPrice' } } }
      ]);
      const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

      // Get staff chat assignments
      const totalChatAssignments = await ChatAssignment.countDocuments({ ...tenantScope, status: { $ne: 'closed' } });
      const assignedChats = await ChatAssignment.countDocuments({ ...tenantScope, status: 'assigned' });
      const inProgressChats = await ChatAssignment.countDocuments({ ...tenantScope, status: 'in_progress' });

      // Get appointment assignments (where assignedTo is not null)
      const staffAssignedAppointments = await Appointment.countDocuments({ ...tenantScope, assignedTo: { $exists: true, $ne: null } });

      // Get campaign stats
      const totalCampaigns = await Campaign.countDocuments(tenantScope);
      const allCampaigns = await Campaign.countDocuments({ ...tenantScope, audience: 'all' });
      const existingCustomerCampaigns = await Campaign.countDocuments({ ...tenantScope, audience: 'existing' });

      // Calculate overall conversion rate
      const overallConversionRate = totalCustomers > 0 ? ((existingCustomers / totalCustomers) * 100).toFixed(2) : 0;

      return {
        customers: {
          total: totalCustomers,
          new: newCustomers,
          existing: existingCustomers,
          conversionRate: overallConversionRate,
        },
        messages: {
          total: totalMessages,
          incoming: incomingMessages,
          outgoing: outgoingMessages,
        },
        appointments: {
          total: totalAppointments,
          pending: pendingAppointments,
          confirmed: confirmedAppointments,
          staffAssigned: staffAssignedAppointments,
        },
        orders: {
          total: totalOrders,
          success: successfulOrders,
          failed: failedOrders,
          successRate: parseFloat(orderSuccessRate),
          failureRate: parseFloat(orderFailureRate),
        },
        revenue: {
          total: totalRevenue,
          averageOrderValue: totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0,
        },
        staffChat: {
          total: totalChatAssignments,
          assigned: assignedChats,
          inProgress: inProgressChats,
        },
        campaigns: {
          total: totalCampaigns,
          allCustomers: allCampaigns,
          existingCustomers: existingCustomerCampaigns,
        },
      };
    } catch (error) {
      console.error('Error in getDashboardAnalytics:', error);
      throw error;
    }
  }
}

export default new AnalyticsService();
