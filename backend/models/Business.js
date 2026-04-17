import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';
import { BUSINESS_TYPES } from './User.js';

const businessSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  },
  businessType: {
    type: String,
    enum: BUSINESS_TYPES,
    default: 'E_COMMERCE',
    required: true,
  },
  category: {
    type: String,
    enum: ['booking', 'ecommerce'],
    default: 'ecommerce',
    required: true,
  },
  whatsappConfig: {
    phoneNumberId: { type: String, trim: true },
    accessToken: { type: String, trim: true },
    wabaId: { type: String, trim: true },
    verifyToken: { type: String, trim: true },
    isActive: { type: Boolean, default: false },
  },
  subscription: {
    plan: {
      type: String,
      enum: ['Free', 'Basic', 'Pro', 'Enterprise'],
      default: 'Free',
    },
    status: {
      type: String,
      enum: ['active', 'past_due', 'canceled', 'trialing'],
      default: 'active',
    },
    expiresAt: { type: Date },
    features: {
      maxFlows: { type: Number, default: 5 },
      maxCampaigns: { type: Number, default: 1 },
      maxUsers: { type: Number, default: 2 },
      analyticsLevel: { type: String, enum: ['basic', 'advanced'], default: 'basic' },
    },
  },
  razorpayConfig: {
    keyId: { type: String, trim: true },
    keySecret: { type: String, trim: true },
    webhookSecret: { type: String, trim: true },
  },
  appointmentConfig: {
    workingHours: [
      {
        day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
        start: { type: String, default: '09:00' },
        end: { type: String, default: '18:00' },
        isActive: { type: Boolean, default: true },
      }
    ],
    slotDuration: { type: Number, default: 30 }, // in minutes
    maxConcurrent: { type: Number, default: 1 }, // max bookings per slot
  },
  cloudinaryConfig: {
    cloudName: { type: String, trim: true },
    apiKey: { type: String, trim: true },
    apiSecret: { type: String, trim: true },
  },
}, {
  timestamps: true,
  collection: COLLECTIONS.BUSINESSES,
});

export default mongoose.model('Business', businessSchema);
