import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    trim: true,
    index: true,
    sparse: true,
    unique: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
  },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      quantity: { type: Number, default: 1 },
      price: { type: Number, default: 0 },
    }
  ],
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  },
  product: {
    type: String,
    required: true,
    trim: true,
  },
  amount: {
    type: Number,
    min: 0,
    default: 0,
  },
  price: {
    type: Number,
    min: 0,
    default: 0,
  },
  quantity: {
    type: Number,
    min: 1,
    default: 1,
  },
  mrp: {
    type: Number,
    min: 0,
    default: 0,
  },
  offerPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  offerPrice: {
    type: Number,
    min: 0,
    default: 0,
  },
  couponCode: {
    type: String,
    trim: true,
    default: '',
  },
  couponDiscount: {
    type: Number,
    min: 0,
    default: 0,
  },
  finalPrice: {
    type: Number,
    min: 0,
    default: 0,
  },
  category: {
    type: String,
    trim: true,
    default: 'General',
  },
  redirectUrl: {
    type: String,
    trim: true,
    default: '',
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    default: null,
  },
  paymentType: {
    type: String,
    enum: ['COD', 'ONLINE'],
    default: 'COD',
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'UPI'],
    default: 'Cash',
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed', 'Refunded', 'Received', 'Refund'],
    default: 'Pending',
  },
  orderStatus: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Cancelled', 'Delivered', 'Return Requested', 'Returned'],
    default: 'Pending',
  },
  refundStatus: {
    type: String,
    enum: ['NONE', 'REQUESTED', 'PROCESSED', 'REJECTED'],
    default: 'NONE',
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Cancelled', 'Delivered', 'Return Requested', 'Returned'],
    default: 'Pending',
  },
  razorpayOrderId: {
    type: String,
    trim: true,
    default: '',
    index: true,
  },
  razorpayPaymentId: {
    type: String,
    trim: true,
    default: '',
  },
  razorpaySignature: {
    type: String,
    trim: true,
    default: '',
  },
  razorpayRefundId: {
    type: String,
    trim: true,
    default: '',
  },
  paymentLink: {
    type: String,
    trim: true,
    default: '',
  },
  address: {
    type: String,
    trim: true,
    default: '',
  },
  cancellationReason: {
    type: String,
    trim: true,
    default: '',
  },
  returnReason: {
    type: String,
    trim: true,
    default: '',
  },
  returnRequestedAt: {
    type: Date,
    default: null,
  },
  returnedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  collection: COLLECTIONS.ORDERS,
});

orderSchema.index({ businessId: 1, createdAt: -1 });
orderSchema.index({ businessId: 1, customerId: 1, createdAt: -1 });
orderSchema.index({ businessId: 1, orderStatus: 1, paymentStatus: 1, createdAt: -1 });
orderSchema.index({ businessId: 1, assignedTo: 1, createdAt: -1 });

orderSchema.pre('validate', function syncOrderCompatibility(next) {
  if (!this.paymentType) {
    this.paymentType = this.paymentMethod === 'UPI' ? 'ONLINE' : 'COD';
  }

  if (!this.paymentMethod) {
    this.paymentMethod = this.paymentType === 'ONLINE' ? 'UPI' : 'Cash';
  }

  if (!this.orderStatus && this.status) {
    this.orderStatus = this.status;
  }

  if (!this.status && this.orderStatus) {
    this.status = this.orderStatus;
  }

  if (!this.finalPrice && this.amount) {
    this.finalPrice = this.amount;
  }

  if (!this.amount) {
    this.amount = Number(this.finalPrice || this.price || 0);
  }

  if (!this.price) {
    this.price = Number(this.finalPrice || this.amount || 0);
  }

  if (this.paymentStatus === 'Received') {
    this.paymentStatus = 'Paid';
  }

  if (this.paymentStatus === 'Refund') {
    this.paymentStatus = 'Refunded';
  }

  next();
});

export default mongoose.model('Order', orderSchema);
