import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    default: '',
  },
  phone: {
    type: String,
    required: true,
  },
  age: {
    type: Number,
    min: 1,
    max: 120,
    default: null,
  },
  address: {
    type: String,
    trim: true,
    default: '',
  },
  upiId: {
    type: String,
    trim: true,
    default: '',
  },
  totalOrders: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: 0,
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  cart: {
    type: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          default: null,
        },
        name: {
          type: String,
          trim: true,
          default: '',
        },
        price: {
          type: Number,
          default: 0,
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
      }
    ],
    default: [],
  },
  status: {
    type: String,
    enum: ['new', 'existing'],
    default: 'new',
  },
  chatState: {
    type: String,
    enum: ['ASK_NAME', 'ASK_AGE', 'MAIN_MENU', 'VIEW_PRODUCTS', 'AWAITING_ORDER', 'AWAITING_PAYMENT', 'BOOK_APPOINTMENT', 'SELECT_TIME_SLOT', 'SUPPORT'],
    default: 'ASK_NAME',
  },
  currentStep: {
    type: String,
    default: 'start',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  lastCampaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    default: null,
  },
  sessionData: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
  },
  tags: {
    type: [String],
    default: [],
  },
  lastInteraction: {
    type: Date,
    default: Date.now,
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  },
}, {
  timestamps: true,
  collection: COLLECTIONS.CUSTOMERS,
});

customerSchema.index({ tenantId: 1, phone: 1 }, { unique: true });
customerSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model('Customer', customerSchema);
