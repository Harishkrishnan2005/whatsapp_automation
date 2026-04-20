import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'dns';
import path from 'path';
import { fileURLToPath } from 'url';

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
import businessRoutes from './routes/business.js';
import usageRoutes from './routes/usage.js';
// Import middleware
import { authenticateToken } from './middlewares/auth.js';
import { apiLimiter, authLimiter, webhookLimiter } from './middlewares/rateLimit.js';

// Import utils
import seedDatabase from './utils/seed.js';
import { checkExpirations } from './scripts/expiryCron.js';
import usageService from './services/usageService.js';

const app = express();

// Global Middlewares
app.use(cors());
app.use(apiLimiter); // Protect everything with a moderate limit

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
  const fallbackUri = process.env.MONGO_URI_FALLBACK;
  const options = {};

  try {
    await mongoose.connect(primaryUri, options);
    console.log('MongoDB connected');
    seedDatabase(); 
    return;
  } catch (err) {
    if (fallbackUri) {
      try {
        await mongoose.connect(fallbackUri, options);
        console.log('MongoDB connected (fallback)');
        seedDatabase();
        return;
      } catch (fErr) { console.error(fErr); }
    }
    console.error('MongoDB error:', err);
  }
}

connectMongo();

/**
 * ROUTES
 * Security Strategy:
 * 1. Webhook: Higher rate limit, custom verification
 * 2. Auth: Strict rate limit for login/register
 * 3. Protected: require JWT (authenticateToken) + tenant filtering (businessContext manually in routes)
 */

app.use('/api/public', publicRoutes);  // Landing page – no auth required
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/webhook', webhookLimiter, webhookRoutes);

// Protected routes
app.use('/api/superadmin', authenticateToken, superAdminRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/staff', authenticateToken, staffRoutes);
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
app.use('/api/business', authenticateToken, businessRoutes);
app.use('/api/usage', authenticateToken, usageRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request payload too large. Please upload a smaller image.' });
  }
  return res.status(err.status || 500).json({ message: err.message || 'Something went wrong!' });
});

const BASE_PORT = parseInt(process.env.PORT, 10) || 5000;

const startServer = (port, maxAttempts = 10) => {
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && maxAttempts > 0) {
      const nextPort = port + 1;
      console.warn(`Port ${port} is in use, retrying on ${nextPort}...`);
      startServer(nextPort, maxAttempts - 1);
      return;
    }

    console.error('Server startup error:', err);
    process.exit(1);
  });
};

startServer(BASE_PORT);

// Scheduled Tasks
setInterval(() => {
  checkExpirations();
  usageService.resetMonthlyUsage();
}, 24 * 60 * 60 * 1000); // Once a day
