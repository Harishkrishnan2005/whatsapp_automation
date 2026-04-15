import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'staff'],
    default: 'staff',
  },
  name: {
    type: String,
    required: true,
  },
  employeeId: {
    type: String,
    unique: true,
    sparse: true,
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
    enum: ['Male', 'Female', 'Other'],
  },
  dateOfBirth: {
    type: Date,
  },
  dateOfJoining: {
    type: Date,
  },
  address: {
    type: String,
    trim: true,
  },
  permissions: [
    {
      type: String,
      enum: ['manage_customers', 'manage_orders', 'manage_campaigns', 'manage_staff', 'manage_chatbot', 'view_analytics', 'handle_chats', 'manage_appointments'],
    },
  ],
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
  collection: COLLECTIONS.USERS,
});

userSchema.index({ businessId: 1, role: 1, isActive: 1 });

export default mongoose.model('User', userSchema);
