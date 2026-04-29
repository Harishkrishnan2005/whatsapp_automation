import DashboardController from '../dashboardController.js';

const AdminDashboardController = {
  getDashboard(req, res) {
    return DashboardController.getAdminDashboard(req, res);
  },
};

export default AdminDashboardController;
