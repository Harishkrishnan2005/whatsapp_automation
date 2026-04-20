import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Business from '../models/Business.js';
import Subscription from '../models/Subscription.js';
import { PLAN_CONFIG } from '../config/plans.js';

dotenv.config();

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const businesses = await Business.find();
    console.log(`Found ${businesses.length} businesses`);

    for (const business of businesses) {
      const plan = business.subscription?.plan || 'FREE';
      const existingSub = await Subscription.findOne({ businessId: business._id, plan });

      if (!existingSub) {
        console.log(`Creating subscription for ${business.name} (Plan: ${plan})`);
        const price = PLAN_CONFIG[plan]?.price || 0;
        
        await Subscription.create({
          businessId: business._id,
          plan,
          price,
          startDate: business.subscription?.startDate || business.createdAt || new Date(),
          endDate: business.subscription?.expiryDate || new Date(Date.now() + 365 * 10 * 24 * 60 * 60 * 1000),
          paymentStatus: plan === 'FREE' ? 'PAID' : 'PENDING', // If they are already on a paid plan but no record, mark as PENDING to be safe, or PAID if we trust migration
          status: 'ACTIVE',
          razorpayOrderId: `MIGRATION_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
        });
      }
    }

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
