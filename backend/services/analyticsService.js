import Customer from '../models/Customer.js';
import Message from '../models/Message.js';
import Order from '../models/Order.js';
import Appointment from '../models/Appointment.js';
import Campaign from '../models/Campaign.js';
import Product from '../models/Product.js';
import ChatAssignment from '../models/ChatAssignment.js';
import Business from '../models/Business.js';
import CustomerStatusService from './customerStatusService.js';
import buildTenantScope from '../utils/tenantScope.js';
import ChatSession from '../models/ChatSession.js';

class AnalyticsService {
  clampRate(value) {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(100, numeric));
  }

  formatRate(value) {
    return this.clampRate(value).toFixed(2);
  }

  async getCustomerStatusTotals(businessId, category = 'ecommerce') {
    const tenantScope = buildTenantScope(businessId);
    const customers = await Customer.find(tenantScope).select('_id');
    const totalCustomers = customers.length;
    const customerIds = customers.map((customer) => customer._id);
    const activityMap = await CustomerStatusService.getActivityCountMap(customerIds, businessId, category);

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
    const business = await Business.findById(businessId).select('category').lean();
    const category = business?.category || 'ecommerce';

    const { totalCustomers, existingCustomers } = await this.getCustomerStatusTotals(businessId, category);
    const totalMessages = await Message.countDocuments(tenantScope);

    let totalActivity = 0;
    let conversionRate = 0;
    if (category === 'booking') {
      totalActivity = await Appointment.countDocuments(tenantScope);
      const totalSessions = await ChatSession.countDocuments(tenantScope);
      const completedFlows = await ChatSession.countDocuments({ ...tenantScope, isCompleted: true });
      conversionRate = totalSessions > 0 ? (completedFlows / totalSessions) * 100 : 0;
    } else {
      totalActivity = await Order.countDocuments(tenantScope);
      const totalSessions = await ChatSession.countDocuments(tenantScope);
      const completedFlows = await Order.countDocuments(tenantScope);
      conversionRate = totalSessions > 0 ? (completedFlows / totalSessions) * 100 : 0;
    }

    const totalProducts = await Product.countDocuments({ ...tenantScope, isActive: true });

    return {
      category,
      totalCustomers,
      totalMessages,
      totalActivity,
      totalOrders: category === 'ecommerce' ? totalActivity : 0,
      totalAppointments: category === 'booking' ? totalActivity : 0,
      totalProducts,
      conversionRate: this.formatRate(conversionRate),
    };
  }

  // Advanced analytics
  async getAdvancedAnalytics(businessId) {
    const tenantScope = buildTenantScope(businessId);
    const business = await Business.findById(businessId).select('businessType category').lean();
    const businessType = business?.businessType || 'E_COMMERCE';
    const category = business?.category || 'ecommerce';

    const { totalCustomers, newCustomers, existingCustomers } = await this.getCustomerStatusTotals(businessId, category);

    const totalMessages = await Message.countDocuments(tenantScope);
    const incomingMessages = await Message.countDocuments({ ...tenantScope, type: 'incoming' });
    const outgoingMessages = await Message.countDocuments({ ...tenantScope, type: 'outgoing' });

    const totalOrders = await Order.countDocuments(tenantScope);
    const pendingOrders = await Order.countDocuments({ ...tenantScope, orderStatus: 'Pending' });
    const confirmedOrders = await Order.countDocuments({ ...tenantScope, orderStatus: 'Confirmed' });
    const deliveredOrders = await Order.countDocuments({ ...tenantScope, orderStatus: 'Delivered' });
    const cancelledOrders = await Order.countDocuments({ ...tenantScope, orderStatus: 'Cancelled' });
    const returnedOrders = await Order.countDocuments({ ...tenantScope, orderStatus: 'Returned' });
    const onlinePaymentsCount = await Order.countDocuments({ ...tenantScope, paymentType: 'ONLINE' });
    const codPaymentsCount = await Order.countDocuments({ ...tenantScope, paymentType: 'COD' });
    const totalRevenue = await Order.aggregate([
      { $match: { ...tenantScope, paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const refundedAmount = await Order.aggregate([
      { $match: { ...tenantScope, orderStatus: 'Returned' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalAppointments = await Appointment.countDocuments(tenantScope);
    const bookedAppointments = await Appointment.countDocuments({ ...tenantScope, status: 'BOOKED' });
    const completedAppointments = await Appointment.countDocuments({ ...tenantScope, status: 'COMPLETED' });
    const cancelledAppointments = await Appointment.countDocuments({ ...tenantScope, status: 'CANCELLED' });

    let estimatedRevenue = 0;
    let ecommerceConversion = 0;
    if (category === 'booking') {
      estimatedRevenue = totalAppointments * 100;
    } else {
      const sessionsStarted = await ChatSession.countDocuments(tenantScope);
      ecommerceConversion = sessionsStarted > 0 ? (totalOrders / sessionsStarted) * 100 : 0;
      estimatedRevenue = Number(totalRevenue[0]?.total || 0);
    }

    return {
      businessType,
      category,
      customers: {
        total: totalCustomers,
        new: newCustomers,
        existing: existingCustomers,
        conversionRate: totalCustomers > 0 ? this.formatRate((existingCustomers / totalCustomers) * 100) : 0,
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
        delivered: deliveredOrders,
        cancelled: cancelledOrders,
        returned: returnedOrders,
        onlinePaymentsCount,
        codPaymentsCount,
      },
      appointments: {
        total: totalAppointments,
        booked: bookedAppointments,
        completed: completedAppointments,
        cancelled: cancelledAppointments,
      },
      revenue: {
        estimated: estimatedRevenue,
        total: Number(totalRevenue[0]?.total || 0),
        refundedAmount: Number(refundedAmount[0]?.total || 0),
      },
      summary: {
        conversionRate: category === 'ecommerce' ? this.formatRate(ecommerceConversion) : 0,
      }
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
        appointments: appointmentCount,
        interactions: orderCount + appointmentCount,
        status,
      });
    }

    return engagement;
  }

  // Comprehensive dashboard analytics
  async getDashboardAnalytics(businessId) {
    try {
      const tenantScope = buildTenantScope(businessId);
      const business = await Business.findById(businessId).select('category').lean();
      const category = business?.category || 'ecommerce';

      if (category === 'ecommerce') {
        const [
          { totalCustomers, newCustomers, existingCustomers },
          totalMessages,
          totalOrders,
          deliveredOrders,
          cancelledOrders,
          returnedOrders,
          onlinePaymentsCount,
          codPaymentsCount,
          paidOrdersCount,
          paidRevenueData,
          refundedAmountData,
          sessionsStarted,
          recentOrders,
          orderTrend,
          messageTrendData,
        ] = await Promise.all([
          this.getCustomerStatusTotals(businessId, category),
          Message.countDocuments(tenantScope),
          Order.countDocuments(tenantScope),
          Order.countDocuments({ ...tenantScope, orderStatus: 'Delivered' }),
          Order.countDocuments({ ...tenantScope, orderStatus: 'Cancelled' }),
          Order.countDocuments({ ...tenantScope, orderStatus: 'Returned' }),
          Order.countDocuments({ ...tenantScope, paymentType: 'ONLINE' }),
          Order.countDocuments({ ...tenantScope, paymentType: 'COD' }),
          Order.countDocuments({ ...tenantScope, paymentStatus: 'Paid' }),
          Order.aggregate([
            { $match: { ...tenantScope, paymentStatus: 'Paid' } },
            { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
          ]),
          Order.aggregate([
            { $match: { ...tenantScope, orderStatus: 'Returned' } },
            { $group: { _id: null, refundedAmount: { $sum: '$amount' } } }
          ]),
          ChatSession.countDocuments(tenantScope),
          Order.find(tenantScope).populate('customerId', 'name phone').sort({ createdAt: -1 }).limit(5).lean(),
          Order.aggregate([
            {
              $match: {
                ...tenantScope,
                createdAt: {
                  $gte: new Date(new Date().setDate(new Date().getDate() - 6))
                }
              }
            },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                confirmed: { $sum: { $cond: [{ $eq: ['$orderStatus', 'Delivered'] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ['$orderStatus', 'Cancelled'] }, 1, 0] } }
              }
            },
            { $sort: { _id: 1 } }
          ]),
          Message.aggregate([
            {
              $match: {
                ...tenantScope,
                createdAt: {
                  $gte: new Date(new Date().setDate(new Date().getDate() - 6))
                }
              }
            },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ]),
        ]);

        const formatTrend = (rawTrend) => {
          const days = [];
          const now = new Date();
          for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const found = rawTrend.find(t => t._id === dateStr);
            days.push({
              name: d.toLocaleDateString('en-US', { weekday: 'short' }),
              value: found ? (found.count || found.confirmed || 0) : 0
            });
          }
          return days;
        };

        const messageTrend = formatTrend(messageTrendData);
        const trendData = formatTrend(orderTrend);

        const totalRevenue = Number(paidRevenueData[0]?.totalRevenue || 0);
        const refundedAmount = Number(refundedAmountData[0]?.refundedAmount || 0);
        const sessionsCompleted = totalOrders;
        const conversionRate = this.formatRate(sessionsStarted > 0 ? (sessionsCompleted / sessionsStarted) * 100 : 0);
        const cancelRate = this.formatRate(totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0);
        const dropOffRate = this.formatRate(sessionsStarted > 0 ? ((sessionsStarted - sessionsCompleted) / sessionsStarted) * 100 : 0);
        const averageOrderValue = paidOrdersCount > 0 ? totalRevenue / paidOrdersCount : 0;

        return {
          category,
          customers: {
            total: totalCustomers,
            new: newCustomers,
            existing: existingCustomers,
          },
          messages: {
            total: totalMessages,
            incoming: await Message.countDocuments({ ...tenantScope, type: 'incoming' }),
            outgoing: await Message.countDocuments({ ...tenantScope, type: 'outgoing' }),
          },
          orders: {
            total: totalOrders,
            success: deliveredOrders,
            failed: cancelledOrders + returnedOrders,
            successRate: this.formatRate(totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0),
            failureRate: this.formatRate(totalOrders > 0 ? ((cancelledOrders + returnedOrders) / totalOrders) * 100 : 0),
            delivered: deliveredOrders,
            cancelled: cancelledOrders,
            returned: returnedOrders,
            onlinePaymentsCount,
            codPaymentsCount,
          },
          appointments: {
            total: 0,
            pending: 0,
            confirmed: 0,
            cancelled: 0,
          },
          summary: {
            totalSessions: sessionsStarted,
            qualifiedLeads: totalCustomers,
            bookingAttempts: 0,
            confirmedAppointments: 0,
            cancelledAppointments: 0,
            conversionRate,
            cancelRate,
            dropOffRate,
            avgMessagesPerUser: sessionsStarted > 0 ? (totalMessages / sessionsStarted).toFixed(1) : '0.0',
            sessionsStarted,
            sessionsCompleted,
          },
          funnel: [
            { step: 'START', label: 'Sessions Started', count: sessionsStarted, dropRate: '0.00' },
            { step: 'ORDERS', label: 'Orders Placed', count: totalOrders, dropRate: this.formatRate(sessionsStarted > 0 ? ((sessionsStarted - totalOrders) / sessionsStarted) * 100 : 0) },
            { step: 'DELIVERED', label: 'Delivered', count: deliveredOrders, dropRate: this.formatRate(totalOrders > 0 ? ((totalOrders - deliveredOrders) / totalOrders) * 100 : 0) },
          ],
          appointmentTrend: trendData,
          engagementTrend: messageTrend,
          revenue: {
            total: totalRevenue,
            averageOrderValue,
            refundedAmount,
          },
          reports: {
            totalRevenue,
            refundedAmount,
            totalOrders,
            cancelledOrders,
            totalCustomers,
          },
          recentOrders,
        };
      }

      // 1. Core Metrics Base
      const [
        { totalCustomers, newCustomers, existingCustomers },
        totalMessages,
        incomingMessages,
        outgoingMessages,
        totalAppointments,
        pendingAppointments,
        confirmedAppointments,
        cancelledAppointments,
        totalOrders,
        successfulOrders,
        failedOrders,
        totalRevenueData,
        totalChatAssignments,
        assignedChats,
        inProgressChats,
        staffAssignedAppointments,
        totalCampaigns,
        allCampaigns,
        existingCustomerCampaigns
      ] = await Promise.all([
        this.getCustomerStatusTotals(businessId, category),
        Message.countDocuments(tenantScope),
        Message.countDocuments({ ...tenantScope, type: 'incoming' }),
        Message.countDocuments({ ...tenantScope, type: 'outgoing' }),
        Appointment.countDocuments(tenantScope),
        Appointment.countDocuments({ ...tenantScope, status: 'PENDING' }),
        Appointment.countDocuments({ ...tenantScope, status: { $in: ['BOOKED', 'CONFIRMED', 'COMPLETED'] } }),
        Appointment.countDocuments({ ...tenantScope, status: 'CANCELLED' }),
        Order.countDocuments(tenantScope),
        Order.countDocuments({ ...tenantScope, paymentStatus: 'Received' }),
        Order.countDocuments({ ...tenantScope, paymentStatus: { $in: ['Pending', 'Refund'] } }),
        Order.aggregate([
          { $match: { ...tenantScope, paymentStatus: 'Received' } },
          { $group: { _id: null, totalRevenue: { $sum: '$finalPrice' } } }
        ]),
        ChatAssignment.countDocuments({ ...tenantScope, status: { $ne: 'closed' } }),
        ChatAssignment.countDocuments({ ...tenantScope, status: 'assigned' }),
        ChatAssignment.countDocuments({ ...tenantScope, status: 'in_progress' }),
        Appointment.countDocuments({ ...tenantScope, assignedTo: { $exists: true, $ne: null } }),
        Campaign.countDocuments(tenantScope),
        Campaign.countDocuments({ ...tenantScope, audience: 'all' }),
        Campaign.countDocuments({ ...tenantScope, audience: 'existing' })
      ]);

      const totalRevenue = totalRevenueData.length > 0 ? totalRevenueData[0].totalRevenue : 0;
      const orderSuccessRate = totalOrders > 0 ? ((successfulOrders / totalOrders) * 100).toFixed(2) : 0;
      const orderFailureRate = totalOrders > 0 ? ((failedOrders / totalOrders) * 100).toFixed(2) : 0;

      // 2. Appointment Funnel Tracking
      const funnelSteps = [
        { id: 'START', label: 'Start Chat', steps: ['start', 'main_menu'] },
        { id: 'GET_NAME', label: 'Provide Name', steps: ['get_name'] },
        { id: 'GET_SERVICE', label: 'Select Service', steps: ['get_service'] },
        { id: 'GET_DATE', label: 'Choose Date', steps: ['get_date'] },
        { id: 'CONFIRM', label: 'Confirm Booking', steps: ['confirm', 'APPOINTMENT_CONFIRMED'] }
      ];

      const funnelData = await Promise.all(funnelSteps.map(async (step) => {
        const count = await ChatSession.countDocuments({
          ...tenantScope,
          stepsCompleted: { $in: step.steps }
        });
        return {
          step: step.id,
          label: step.label,
          count
        };
      }));

      // Calculate drop-off per step
      const funnel = funnelData.map((step, index) => {
        const prevCount = index === 0 ? step.count : funnelData[index - 1].count;
        const dropRate = prevCount > 0 ? (((prevCount - step.count) / prevCount) * 100).toFixed(2) : 0;
        return { ...step, dropRate };
      });

      // 3. Specialized Appointment Metrics
      const totalSessions = await ChatSession.countDocuments(tenantScope);
      const qualifiedLeads = await ChatSession.countDocuments({
        ...tenantScope,
        stepsCompleted: { $all: ['get_name', 'get_service'] }
      });
      const bookingAttempts = await ChatSession.countDocuments({
        ...tenantScope,
        stepsCompleted: { $in: ['get_date', 'get_time'] }
      });

      const appointmentConversionRate = totalSessions > 0 
        ? ((confirmedAppointments / totalSessions) * 100).toFixed(2)
        : 0;
      
      const cancelRate = confirmedAppointments > 0
        ? ((cancelledAppointments / confirmedAppointments) * 100).toFixed(2)
        : 0;

      const dropOffRate = totalSessions > 0 
        ? (((totalSessions - confirmedAppointments) / totalSessions) * 100).toFixed(2)
        : 0;

      const avgMessagesPerUser = totalSessions > 0 
        ? (totalMessages / totalSessions).toFixed(1) 
        : 0;

      // 4. Trends (Upcoming Appointments for next 7 days)
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      
      const endOfNextWeek = new Date(startOfToday);
      endOfNextWeek.setDate(endOfNextWeek.getDate() + 7);

      const rawTrend = await Appointment.aggregate([
        { 
          $match: { 
            ...tenantScope, 
            date: { $gte: startOfToday, $lt: endOfNextWeek } 
          } 
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            confirmed: { $sum: { $cond: [{ $in: ["$status", ["BOOKED", "CONFIRMED", "COMPLETED"]] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0] } }
          }
        },
        { $sort: { "_id": 1 } }
      ]);

      const trendMap = new Map(rawTrend.map(t => [t._id, t]));
      const appointmentTrend = [];
      
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfToday);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const existing = trendMap.get(dateStr);
        appointmentTrend.push(existing || { _id: dateStr, confirmed: 0, cancelled: 0 });
      }

      const rawMessageTrend = await Message.aggregate([
        {
          $match: {
            ...tenantScope,
            createdAt: {
              $gte: new Date(new Date().setDate(new Date().getDate() - 6))
            }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const messageTrend = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const found = rawMessageTrend.find(t => t._id === dateStr);
        messageTrend.push({
          name: d.toLocaleDateString('en-US', { weekday: 'short' }),
          value: found ? found.count : 0
        });
      }

      return {
        category,
        funnel,
        appointmentTrend,
        engagementTrend: messageTrend,
        summary: {
          totalSessions,
          qualifiedLeads,
          bookingAttempts,
          confirmedAppointments,
          cancelledAppointments,
          conversionRate: appointmentConversionRate,
          cancelRate,
          dropOffRate,
          avgMessagesPerUser
        },
        customers: {
          total: totalCustomers,
          new: newCustomers,
          existing: existingCustomers,
          totalSessions,
          conversionRate: appointmentConversionRate,
          avgMessagesPerUser,
          dropOffRate,
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
          cancelled: cancelledAppointments,
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
          averageOrderValue: totalOrders > 0 ? (totalRevenue / totalOrders) : 0,
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
