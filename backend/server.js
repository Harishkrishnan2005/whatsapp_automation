import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'dns';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import socketManager from './utils/socketManager.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
dns.setServers(['8.8.8.8', '8.8.4.4']);

// Import routes
import authRoutes from './routes/auth.js';
import superAdminRoutes from './routes/superadmin.js';
import adminRoutes from './routes/admin.js';
import staffRoutes from './routes/staff.js';
import webhookRoutes from './routes/webhook.js';
import customerRoutes from './routes/customer.js';
import orderRoutes from './routes/order.js';
import campaignRoutes from './routes/campaign.js';
import analyticsRoutes from './routes/analytics.js';
import chatbotRoutes from './routes/chatbot.js';
import appointmentRoutes from './routes/appointment.js';
import chatAssignmentRoutes from './routes/chatAssignment.js';
import quickReplyRoutes from './routes/quickReply.js';
import notificationRoutes from './routes/notification.js';
import productRoutes from './routes/product.js';
import chatRoutes from './routes/chat.js';
import assignRoutes from './routes/assign.js';
import staffChatsRoutes from './routes/staffChats.js';
import notesRoutes from './routes/notes.js';
import dashboardRoutes from './routes/dashboard.js';
import subscriptionRoutes from './routes/subscription.js';
import publicRoutes from './routes/public.js';
import simulationChatRoutes from './routes/simulationChat.js';
import supportTicketRoutes from './routes/supportTicket.js';
import feedbackRoutes from './routes/feedback.js';
import businessRoutes from './routes/business.js';
import usageRoutes from './routes/usage.js';
import templatesRoutes from './routes/templates.js';
import messageTemplatesRoutes from './routes/messageTemplates.js';
import conversationRoutes from './routes/conversationRoutes.js';
import cartRoutes from './routes/cart.js';
import adminDashboardRoutes from './routes/admin/dashboard.routes.js';
import adminAnalyticsRoutes from './routes/admin/analytics.routes.js';
import adminCustomersRoutes from './routes/admin/customers.routes.js';
import adminOrdersRoutes from './routes/admin/orders.routes.js';
import adminAppointmentsRoutes from './routes/admin/appointments.routes.js';
import adminConversationsRoutes from './routes/admin/conversations.routes.js';
import adminChatbotRoutes from './routes/admin/chatbot.routes.js';
import adminStaffRoutes from './routes/admin/staff.routes.js';
import adminBillingRoutes from './routes/admin/billing.routes.js';
import staffDashboardRoutes from './routes/staff/dashboard.routes.js';
import staffConversationsRoutes from './routes/staff/conversations.routes.js';
import staffAppointmentsRoutes from './routes/staff/appointments.routes.js';
import staffOrdersRoutes from './routes/staff/orders.routes.js';
import publicChatRoutes from './routes/public/chat.routes.js';
import publicCartRoutes from './routes/public/cart.routes.js';
import publicOrderRoutes from './routes/public/order.routes.js';
import publicAppointmentRoutes from './routes/public/appointment.routes.js';
// Import middleware
import { authenticateToken } from './middlewares/auth.js';
import { apiLimiter, authLimiter, webhookLimiter } from './middlewares/rateLimit.js';

// Import utils
import seedDatabase from './utils/seed.js';
import { checkExpirations } from './scripts/expiryCron.js';
import usageService from './services/usageService.js';

import logger from './utils/logger.js';
import errorHandler from './middlewares/errorHandler.js';

const app = express();
const server = createServer(app);

// Initialize Socket.io
socketManager.init(server);

// Global Middlewares
app.use(cors());
app.use(apiLimiter);

// Custom body parsing for Razorpay
app.use((req, res, next) => {
  if (String(req.originalUrl || '').startsWith('/api/webhook/razorpay')) {
    return next();
  }
  return express.json({ limit: '10mb' })(req, res, next);
});

// Connect to MongoDB
async function connectMongo() {
  const primaryUri = process.env.MONGO_URI;
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };

  try {
    await mongoose.connect(primaryUri, options);
    logger.info('MongoDB connected successfully');
    seedDatabase(); 
    return;
  } catch (err) {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

connectMongo();

// ROUTES
app.use('/api/public', publicRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/webhook', webhookLimiter, webhookRoutes);

// Protected routes
app.use('/api/superadmin', authenticateToken, superAdminRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin/customers', adminCustomersRoutes);
app.use('/api/admin/orders', adminOrdersRoutes);
app.use('/api/admin/appointments', adminAppointmentsRoutes);
app.use('/api/admin/conversations', adminConversationsRoutes);
app.use('/api/admin/chatbot', adminChatbotRoutes);
app.use('/api/admin/staff', adminStaffRoutes);
app.use('/api/admin/billing', adminBillingRoutes);
app.use('/api/staff/dashboard', staffDashboardRoutes);
app.use('/api/staff/conversations', staffConversationsRoutes);
app.use('/api/staff/appointments', staffAppointmentsRoutes);
app.use('/api/staff/orders', staffOrdersRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/staff', authenticateToken, staffRoutes);
app.use('/api/public/chat', publicChatRoutes);
app.use('/api/public/cart', publicCartRoutes);
app.use('/api/public/order', publicOrderRoutes);
app.use('/api/public/appointment', publicAppointmentRoutes);
app.use('/api/customers', authenticateToken, customerRoutes);
app.use('/api/orders', authenticateToken, orderRoutes);
app.use('/api/campaigns', authenticateToken, campaignRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);
app.use('/api/chatbot', authenticateToken, chatbotRoutes);
app.use('/api/appointments', authenticateToken, appointmentRoutes);
app.use('/api/notes', authenticateToken, notesRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/chats', authenticateToken, chatAssignmentRoutes);
app.use('/api/staff/chats', authenticateToken, staffChatsRoutes);
app.use('/api/assign', authenticateToken, assignRoutes);
app.use('/api/quick-replies', authenticateToken, quickReplyRoutes);
app.use('/api/products', authenticateToken, productRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);
app.use('/api/chat-management', authenticateToken, chatRoutes);
app.use('/api/chat', authenticateToken, simulationChatRoutes);
app.use('/api/subscription', authenticateToken, subscriptionRoutes);
app.use('/api/support', authenticateToken, supportTicketRoutes);
app.use('/api/feedback', authenticateToken, feedbackRoutes);
app.use('/api/business', authenticateToken, businessRoutes);
app.use('/api/usage', authenticateToken, usageRoutes);
app.use('/api/templates', authenticateToken, templatesRoutes);
app.use('/api/message-templates', authenticateToken, messageTemplatesRoutes);
app.use('/api/conversations', authenticateToken, conversationRoutes);
app.use('/api/cart', authenticateToken, cartRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Error handling middleware
app.use(errorHandler);

const BASE_PORT = parseInt(process.env.PORT, 10) || 5000;

const startServer = (port, maxAttempts = 10) => {
  server.listen(port, () => {
    logger.info(`Server running on port ${port} in ${process.env.NODE_ENV || 'development'} mode (Real-time Enabled)`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && maxAttempts > 0) {
      const nextPort = port + 1;
      logger.warn(`Port ${port} is in use, retrying on ${nextPort}...`);
      startServer(nextPort, maxAttempts - 1);
      return;
    }

    logger.error('Server startup error:', err);
    process.exit(1);
  });
};

startServer(BASE_PORT);

// Scheduled Tasks
setInterval(() => {
  checkExpirations();
  usageService.resetMonthlyUsage();
}, 24 * 60 * 60 * 1000); // Once a day
