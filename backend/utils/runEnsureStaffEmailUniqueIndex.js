import dotenv from 'dotenv';
import mongoose from 'mongoose';
import ensureStaffEmailUniqueIndex from './ensureStaffEmailUniqueIndex.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await ensureStaffEmailUniqueIndex(console);
    console.log('Staff email index migration completed.');
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('Staff email index migration failed:', error.message);
  process.exit(1);
});
