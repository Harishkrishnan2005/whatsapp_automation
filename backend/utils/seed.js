import AuthService from '../services/authService.js';
import seedTemplates from '../scripts/seedTemplates.js';

const seedDatabase = async () => {
  await AuthService.seedSuperAdmin();
  await seedTemplates();
};

export default seedDatabase;
