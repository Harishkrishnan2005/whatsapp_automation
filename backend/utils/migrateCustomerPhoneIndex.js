import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Customer from '../models/Customer.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    const indexes = await Customer.collection.indexes();
    const hasLegacyPhoneIndex = indexes.some((idx) => idx.name === 'phone_1');
    const hasScopedIndex = indexes.some((idx) => idx.name === 'businessId_1_phone_1');

    if (hasLegacyPhoneIndex) {
      console.log('Dropping legacy index: phone_1');
      await Customer.collection.dropIndex('phone_1');
    } else {
      console.log('Legacy phone_1 index not found, skipping drop.');
    }

    if (!hasScopedIndex) {
      console.log('Creating scoped unique index: { businessId: 1, phone: 1 }');
      await Customer.collection.createIndex(
        { businessId: 1, phone: 1 },
        { unique: true, name: 'businessId_1_phone_1' }
      );
    } else {
      console.log('Scoped index already exists, skipping create.');
    }

    console.log('Customer phone index migration completed.');
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('Customer phone index migration failed:', error.message);
  process.exit(1);
});
