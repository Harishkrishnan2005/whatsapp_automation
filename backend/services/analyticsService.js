import Customer from '../models/Customer.js';
import Message from '../models/Message.js';
import Order from '../models/Order.js';
import Appointment from '../models/Appointment.js';
import Campaign from '../models/Campaign.js';
import Product from '../models/Product.js';
import ChatAssignment from '../models/ChatAssignment.js';
import CustomerStatusService from './customerStatusService.js';

class AnalyticsService {
  async getCustomerStatusTotals() {
    const customers = await Customer.find().select('_id');
    const totalCustomers = customers.length;
    const customerIds = customers.map((customer) => customer._id);
    const activityMap = await CustomerStatusService.getActivityCountMap(customerIds);

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

  async getAnalytics() {
    const { totalCustomers, existingCustomers } = await this.getCustomerStatusTotals();
    const totalMessages = await Message.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments({ isActive: true });
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
  async getAdvancedAnalytics() {
    const { totalCustomers, newCustomers, existingCustomers } = await this.getCustomerStatusTotals();

    const totalMessages = await Message.countDocuments();
    const incomingMessages = await Message.countDocuments({ type: 'incoming' });
    const outgoingMessages = await Message.countDocuments({ type: 'outgoing' });

    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'Pending' });
    const confirmedOrders = await Order.countDocuments({ status: 'Confirmed' });

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
  async getCampaignPerformance() {
    const campaigns = await Campaign.find();
    const performance = [];

    for (const campaign of campaigns) {
      const messagesSent = await Message.countDocuments({
        message: campaign.message,
        type: 'outgoing',
      });
      performance.push({
        campaignId: campaign._id,
        message: campaign.message,
        messagesSent,
        successRate: ((messagesSent / Math.max(1, await Customer.countDocuments())) * 100).toFixed(2),
        sentAt: campaign.sentAt,
      });
    }

    return performance;
  }

  // Customer engagement
  async getCustomerEngagement() {
    const customers = await Customer.find();
    const engagement = [];

    for (const customer of customers) {
      const messageCount = await Message.countDocuments({ customerId: customer._id });
      const orderCount = await Order.countDocuments({ customerId: customer._id });
      const appointmentCount = await Appointment.countDocuments({ customerId: customer._id });
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
  async getDashboardAnalytics() {
    try {
      // Get customer stats
      const { totalCustomers, newCustomers, existingCustomers } = await this.getCustomerStatusTotals();

      // Get message stats
      const totalMessages = await Message.countDocuments();
      const incomingMessages = await Message.countDocuments({ type: 'incoming' });
      const outgoingMessages = await Message.countDocuments({ type: 'outgoing' });

      // Get appointment stats
      const totalAppointments = await Appointment.countDocuments();
      const pendingAppointments = await Appointment.countDocuments({ status: 'Pending' });
      const confirmedAppointments = await Appointment.countDocuments({ status: 'Confirmed' });

      // Get order stats
      const totalOrders = await Order.countDocuments();
      
      // Calculate product ordered conversion rate (success/failure)
      const successfulOrders = await Order.countDocuments({ paymentStatus: 'Received' });
      const failedOrders = await Order.countDocuments({ paymentStatus: { $in: ['Pending', 'Refund'] } });
      const orderSuccessRate = totalOrders > 0 ? ((successfulOrders / totalOrders) * 100).toFixed(2) : 0;
      const orderFailureRate = totalOrders > 0 ? ((failedOrders / totalOrders) * 100).toFixed(2) : 0;

      // Calculate actual revenue (sum of finalPrice of successful orders)
      const revenueData = await Order.aggregate([
        { $match: { paymentStatus: 'Received' } },
        { $group: { _id: null, totalRevenue: { $sum: '$finalPrice' } } }
      ]);
      const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

      // Get staff chat assignments
      const totalChatAssignments = await ChatAssignment.countDocuments({ status: { $ne: 'closed' } });
      const assignedChats = await ChatAssignment.countDocuments({ status: 'assigned' });
      const inProgressChats = await ChatAssignment.countDocuments({ status: 'in_progress' });

      // Get appointment assignments (where assignedTo is not null)
      const staffAssignedAppointments = await Appointment.countDocuments({ assignedTo: { $exists: true, $ne: null } });

      // Get campaign stats
      const totalCampaigns = await Campaign.countDocuments();
      const allCampaigns = await Campaign.countDocuments({ audience: 'all' });
      const existingCustomerCampaigns = await Campaign.countDocuments({ audience: 'existing' });

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
