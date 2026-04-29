import Customer from '../models/Customer.js';
import Message from '../models/Message.js';
import Order from '../models/Order.js';
import Campaign from '../models/Campaign.js';
import Appointment from '../models/Appointment.js';
import Product from '../models/Product.js';
import ChatAssignment from '../models/ChatAssignment.js';
import Business from '../models/Business.js';
import AnalyticsService from '../services/analyticsService.js';
import buildTenantScope from '../utils/tenantScope.js';
import SupportTicket from '../models/SupportTicket.js';
import Feedback from '../models/Feedback.js';
import Conversation from '../models/Conversation.js';

class DashboardController {
  async safeQuery(fn, fallbackValue, label) {
    try {
      const result = await fn();
      return result === undefined ? fallbackValue : result;
    } catch (error) {
      console.error(`Dashboard query failed (${label}):`, error.message);
      return fallbackValue;
    }
  }

  // Admin Dashboard
  async getAdminDashboard(req, res) {
    try {
      const businessId = req.businessId || req.user?.businessId;
      if (!businessId) {
        return res.status(400).json({ message: 'Business ID is required' });
      }

      const business = await this.safeQuery(() => Business.findById(businessId).select('category').lean(), { category: 'ecommerce' }, 'businessInfo');
      const category = business?.category || 'ecommerce';
      const tenantScope = buildTenantScope(businessId);

      const [
        totalCustomers,
        totalMessages,
        totalOrders,
        totalAppointments,
        analyticsSummary,
        recentChats,
        recentOrders,
        recentBookings
      ] = await Promise.all([
        this.safeQuery(() => Customer.countDocuments(tenantScope), 0, 'totalCustomers'),
        this.safeQuery(() => Message.countDocuments(tenantScope), 0, 'totalMessages'),
        this.safeQuery(() => Order.countDocuments(tenantScope), 0, 'totalOrders'),
        this.safeQuery(() => Appointment.countDocuments(tenantScope), 0, 'totalAppointments'),
        this.safeQuery(() => AnalyticsService.getDashboardAnalytics(businessId), {}, 'analyticsSummary'),
        this.safeQuery(() => Message.find(tenantScope).populate('customerId', 'name phone').sort({ createdAt: -1 }).limit(5).lean(), [], 'recentChats'),
        this.safeQuery(() => Order.find(tenantScope).populate('customerId', 'name phone').sort({ createdAt: -1 }).limit(5).lean(), [], 'recentOrders'),
        this.safeQuery(() => Appointment.find(tenantScope).populate('customerId', 'name phone').sort({ createdAt: -1 }).limit(5).lean(), [], 'recentBookings'),
      ]);

      // Ensure all required fields for the frontend are present
      const responseData = {
        category,
        totalCustomers,
        totalMessages,
        totalOrders,
        totalAppointments,
        recentChats,
        recentOrders,
        recentBookings,
        conversionRate: analyticsSummary?.summary?.conversionRate || analyticsSummary?.conversionRate || '0.00',
        engagementTrend: analyticsSummary?.engagementTrend || [],
        ...analyticsSummary
      };

      res.json(responseData);
    } catch (error) {
      console.error('Dashboard getAdminDashboard failed:', error);
      res.status(500).json({ message: 'Failed to load dashboard data' });
    }
  }

  // Staff Dashboard
  async getStaffDashboard(req, res) {
    try {
      const userId = req.user.id;
      const businessId = req.businessId || req.user?.businessId;
      const tenantScope = buildTenantScope(businessId);
      
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      const [
        assignedChats,
        assignedOrders,
        assignedTickets,
        assignedFeedback,
        todaysBookings,
        upcomingBookings,
        completedBookings,
        recentChats,
        recentBookings,
        recentOrders,
        recentTickets,
      ] = await Promise.all([
        this.safeQuery(() => Conversation.countDocuments({ assignedTo: userId, status: { $ne: 'closed' }, ...tenantScope }), 0, 'assignedChats'),
        this.safeQuery(() => Order.countDocuments({ assignedTo: userId, ...tenantScope }), 0, 'assignedOrders'),
        this.safeQuery(() => SupportTicket.countDocuments({ assignedTo: userId, status: { $ne: 'RESOLVED' }, ...tenantScope }), 0, 'assignedTickets'),
        this.safeQuery(() => Feedback.countDocuments({ assignedTo: userId, status: { $ne: 'RESPONDED' }, ...tenantScope }), 0, 'assignedFeedback'),
        this.safeQuery(() => Appointment.countDocuments({
          ...tenantScope,
          assignedTo: userId,
          date: { $gte: todayStart, $lt: todayEnd }
        }), 0, 'todaysBookings'),
        this.safeQuery(() => Appointment.countDocuments({
          ...tenantScope,
          assignedTo: userId,
          date: { $gte: todayStart },
          status: { $in: ['BOOKED', 'CONFIRMED', 'RESCHEDULED', 'PENDING'] }
        }), 0, 'upcomingBookings'),
        this.safeQuery(() => Appointment.countDocuments({
          ...tenantScope,
          assignedTo: userId,
          status: 'COMPLETED'
        }), 0, 'completedBookings'),
        this.safeQuery(() => ChatAssignment.find({ assignedTo: userId, ...tenantScope })
          .populate('customerId', 'name')
          .sort({ updatedAt: -1 })
          .limit(5).lean(), [], 'recentChats'),
        this.safeQuery(() => Appointment.find({ assignedTo: userId, ...tenantScope })
          .populate('customerId', 'name')
          .sort({ date: 1 })
          .limit(5).lean(), [], 'recentBookings'),
        this.safeQuery(() => Order.find({ assignedTo: userId, ...tenantScope })
          .populate('customerId', 'name phone')
          .sort({ createdAt: -1 })
          .limit(5).lean(), [], 'recentOrders'),
        this.safeQuery(() => SupportTicket.find({ assignedTo: userId, ...tenantScope })
          .populate('customerId', 'name phone')
          .sort({ updatedAt: -1 })
          .limit(5).lean(), [], 'recentTickets')
      ]);

      res.json({
        totalAssigned: assignedChats + assignedOrders + assignedTickets + assignedFeedback,
        assignedChats,
        assignedOrders,
        assignedTickets,
        assignedFeedback,
        todaysBookings,
        upcomingBookings,
        completedBookings,
        recentChats,
        recentBookings,
        recentOrders,
        recentTickets,
      });
    } catch (error) {
      console.error('Dashboard getStaffDashboard failed:', error);
      res.status(500).json({ message: 'Failed to load staff dashboard data' });
    }
  }
}

export default new DashboardController();
