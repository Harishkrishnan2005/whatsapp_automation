import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Business from '../models/Business.js';

dotenv.config();

export const checkExpirations = async () => {
  try {
    const now = new Date();
    
    // Find businesses whose subscription has expired and are still ACTIVE
    const expiredBusinesses = await Business.find({
      'subscription.expiryDate': { $lt: now },
      'subscription.status': 'ACTIVE',
      'subscription.plan': { $ne: 'FREE' } // Don't expire FREE plan
    });

    for (const business of expiredBusinesses) {
      console.log(`Expiring plan for business: ${business.name} (${business._id})`);
      
      business.subscription.status = 'EXPIRED';
      business.subscription.plan = 'FREE';
      // Optionally reset expiry date or set to null
      
      await business.save();
    }

    console.log(`Expiration check completed. Processed ${expiredBusinesses.length} businesses.`);
  } catch (error) {
    console.error('Expiration check failed', error);
  }
};

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
      await checkExpirations();
      mongoose.connection.close();
    })
    .catch(err => console.error(err));
}
