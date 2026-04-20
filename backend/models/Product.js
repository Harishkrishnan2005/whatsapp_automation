import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const specificationSchema = new mongoose.Schema({
  label: {
    type: String,
    trim: true,
    default: '',
  },
  value: {
    type: String,
    trim: true,
    default: '',
  },
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    min: 0,
    default: null,
  },
  mrp: {
    type: Number,
    required: true,
    min: 0,
  },
  offerPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  offerPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  unitType: {
    type: String,
    enum: ['kg', 'piece', 'unit', 'liter', 'gram'],
    default: 'unit',
  },
  category: {
    type: String,
    trim: true,
    default: 'General',
  },
  image: {
    type: String,
    trim: true,
  },
  redirectUrl: {
    type: String,
    trim: true,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  numReviews: {
    type: Number,
    default: 0,
  },
  specifications: {
    type: [specificationSchema],
    default: [],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
  },
}, {
  timestamps: true,
  collection: COLLECTIONS.PRODUCTS,
});

productSchema.index({ businessId: 1, isActive: 1, createdAt: -1 });

productSchema.pre('validate', function normalizePrice(next) {
  if (this.price == null) {
    if (typeof this.offerPrice === 'number' && Number.isFinite(this.offerPrice)) {
      this.price = this.offerPrice;
    } else if (typeof this.mrp === 'number' && Number.isFinite(this.mrp)) {
      this.price = this.mrp;
    }
  }
  next();
});

export default mongoose.model('Product', productSchema);
