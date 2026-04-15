import AuthService from '../services/authService.js';

const seedDatabase = async () => {
  await AuthService.seedSuperAdmin();
};

export default seedDatabase;
