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
// Import middleware
import { authenticateToken } from './middlewares/auth.js';

// Import utils
import seedDatabase from './utils/seed.js';

const app = express();

// Middleware
app.use(cors());
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
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };

  try {
    await mongoose.connect(primaryUri, options);
    console.log('MongoDB connected');
    seedDatabase(); // Seed admin user
    return;
  } catch (err) {
    const isSrvDnsError = err?.syscall === 'querySrv' || err?.code === 'ECONNREFUSED';

    if (isSrvDnsError && fallbackUri) {
      console.warn('MongoDB SRV DNS lookup failed, retrying with MONGO_URI_FALLBACK...');
      try {
        await mongoose.connect(fallbackUri, options);
        console.log('MongoDB connected (fallback URI)');
        seedDatabase(); // Seed admin user
        return;
      } catch (fallbackErr) {
        console.error('MongoDB fallback connection error:', fallbackErr);
        return;
      }
    }

    console.error('MongoDB connection error:', err);
  }
}

connectMongo();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/customers', authenticateToken, customerRoutes);
app.use('/api/orders', authenticateToken, orderRoutes);
app.use('/api/campaigns', authenticateToken, campaignRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chatbot', authenticateToken, chatbotRoutes);
app.use('/api/appointments', authenticateToken, appointmentRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/chats', authenticateToken, chatAssignmentRoutes);
app.use('/api/staff/chats', authenticateToken, staffChatsRoutes);
app.use('/api/assign', authenticateToken, assignRoutes);
app.use('/api/quick-replies', authenticateToken, quickReplyRoutes);
app.use('/api/products', authenticateToken, productRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat-management', authenticateToken, chatRoutes);

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
