import rateLimit from 'express-rate-limit';

/**
 * Standard API rate limiter
 * limits requests to 500 per 15 minutes per IP (Relaxed for SaaS polling)
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  message: {
    message: 'Too many requests from this IP, please try again after 15 minutes',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Stricter limiter for Auth routes
 * 20 attempts per 1 hour (Increased for Dev/Testing)
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: {
    message: 'Too many login attempts, please try again after an hour',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * WhatsApp Webhook limiter
 * Higher limit for incoming traffic
 */
export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, 
  message: {
    message: 'Too many webhook events',
    code: 'WEBHOOK_RATE_LIMIT_EXCEEDED',
  },
});
