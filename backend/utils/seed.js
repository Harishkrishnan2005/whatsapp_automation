import AuthService from '../services/authService.js';
import messageTemplateService from '../services/messageTemplateService.js';

const seedDatabase = async () => {
  await AuthService.seedSuperAdmin();
  await messageTemplateService.seedDefaultTemplates();
};

export default seedDatabase;
