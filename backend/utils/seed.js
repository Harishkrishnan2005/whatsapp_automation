import AuthService from '../services/authService.js';

const seedDatabase = async () => {
  await AuthService.seedAdmin();
};

export default seedDatabase;
