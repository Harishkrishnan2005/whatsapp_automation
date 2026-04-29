import DashboardController from '../dashboardController.js';

const StaffDashboardController = {
  getDashboard(req, res) {
    return DashboardController.getStaffDashboard(req, res);
  },
};

export default StaffDashboardController;
