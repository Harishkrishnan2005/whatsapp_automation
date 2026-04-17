import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Business from '../models/Business.js';
import ChatbotFlow from '../models/ChatbotFlow.js';
import chatbotSeederService from '../services/chatbotSeederService.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedExistingBusinesses = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI not found in environment');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('[SEEDER] Connected to MongoDB');

    const businesses = await Business.find();
    console.log(`[SEEDER] Found ${businesses.length} businesses`);

    for (const business of businesses) {
      const flowCount = await ChatbotFlow.countDocuments({ businessId: business._id });
      if (flowCount === 0) {
        const category = business.category || 'ecommerce';
        console.log(`[SEEDER] Seeding ${category} flows for business: ${business.name} (${business._id})`);
        
        if (category === 'booking') {
          await chatbotSeederService.seedBookingFlows(business._id);
        } else {
          await chatbotSeederService.seedEcommerceFlows(business._id);
        }
      } else {
        console.log(`[SEEDER] Business ${business.name} already has ${flowCount} flows. Skipping.`);
      }
    }

    console.log('[SEEDER] All businesses processed');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[SEEDER] Error during manual seeding:', err);
    process.exit(1);
  }
};

seedExistingBusinesses();
