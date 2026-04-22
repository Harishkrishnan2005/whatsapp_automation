import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Conversation from '../backend/models/Conversation.js';
import Business from '../backend/models/Business.js';

dotenv.config({ path: 'backend/.env' });

async function verify() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const biz = await Business.findOne();
  if (!biz) {
    console.log('No business found');
    process.exit(0);
  }

  const phone = '919876543210';
  const convo = await Conversation.findOne({ phone, businessId: biz._id });
  
  if (convo) {
    console.log('Conversation found for ' + phone);
    console.log('Messages:', convo.messages.length);
    convo.messages.forEach(m => {
      console.log(`- [${m.sender}] ${m.text}`);
    });
  } else {
    console.log('No conversation found for ' + phone);
  }

  await mongoose.disconnect();
}

verify();
