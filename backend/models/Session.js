import mongoose from 'mongoose';
import COLLECTIONS from '../config/mongoCollections.js';

const sessionContextSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    age: { type: Number, default: null },
    address: { type: String, default: '' },
    selectedProduct: { type: String, default: '' },
    orderId: { type: String, default: '' },
  },
  { _id: false, strict: false }
);

const sessionSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    currentStep: {
      type: String,
      default: 'start',
    },
    context: {
      type: sessionContextSchema,
      default: () => ({}),
    },
    lastMessage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.SESSIONS || 'sessions',
  }
);

sessionSchema.virtual('step')
  .get(function stepGetter() {
    return this.currentStep;
  })
  .set(function stepSetter(value) {
    this.currentStep = value;
  });

sessionSchema.index({ tenantId: 1, phone: 1 }, { unique: true });
sessionSchema.index({ tenantId: 1, customerId: 1 });

export default mongoose.model('Session', sessionSchema);
