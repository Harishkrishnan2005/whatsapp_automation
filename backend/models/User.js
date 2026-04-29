import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

export const BUSINESS_TYPES = ['E_COMMERCE', 'BOOKING'];
export const STAFF_ROLES = ['SUPPORT', 'SALES', 'MARKETING', 'MANAGER'];
export const STAFF_STATUSES = ['ACTIVE', 'INACTIVE'];

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
    staffRole: {
      type: String,
      enum: STAFF_ROLES,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: STAFF_STATUSES,
      default: 'ACTIVE',
      index: true,
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
userSchema.index({ businessId: 1, role: 1, staffRole: 1, status: 1 });
userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      role: 'staff',
      email: { $type: 'string' },
    },
  }
);

userSchema.pre('validate', function syncStaffStatus(next) {
  if (this.role !== 'staff') {
    this.staffRole = null;
    this.status = this.status || 'ACTIVE';
    this.isActive = this.isActive !== false;
    return next();
  }

  if (!this.staffRole) {
    this.staffRole = 'SUPPORT';
  }

  if (!this.status) {
    this.status = this.isActive === false ? 'INACTIVE' : 'ACTIVE';
  }

  this.isActive = this.status === 'ACTIVE';
  next();
});

export default mongoose.model('User', userSchema);
