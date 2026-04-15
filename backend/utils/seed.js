import AuthService from '../services/authService.js';
import Business from '../models/Business.js';
import seedChatbotFlows from './seedChatbotFlows.js';

const seedDatabase = async () => {
  await AuthService.seedAdmin();
  const business = await Business.findOne({ email: 'admin@test.com' }).select('_id').lean();
  if (business?._id) {
    await seedChatbotFlows(business._id);
  }
};

export default seedDatabase;
