import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

export const BUSINESS_TYPES = ['E_COMMERCE', 'BOOKING'];

const userSchema = new mongoose.Schema(
  {
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
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'staff'],
      default: 'staff',
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: function () {
        return this.role !== 'super_admin';
      },
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: function () {
        return this.role !== 'super_admin';
      },
      index: true,
    },
    associatedBusinesses: [
      {
        businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
        role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
        businessType: { type: String, enum: BUSINESS_TYPES }
      }
    ],
    businessType: {
      type: String,
      enum: BUSINESS_TYPES,
      default: 'E_COMMERCE',
      required: function () {
        return this.role !== 'super_admin';
      },
      index: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    employeeId: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    dateOfJoining: {
      type: Date,
      default: null,
    },
    address: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.USERS,
  }
);

userSchema.index({ businessId: 1, role: 1 });

export default mongoose.model('User', userSchema);
