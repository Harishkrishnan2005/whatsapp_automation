import AuthController from '../authController.js';
import Appointment from '../../models/Appointment.js';
import Conversation from '../../models/Conversation.js';
import Order from '../../models/Order.js';
import User from '../../models/User.js';
import buildTenantScope from '../../utils/tenantScope.js';

const AdminStaffController = {
  list(req, res) {
    return AuthController.getStaffUsers(req, res);
  },

  create(req, res) {
    return AuthController.createStaff(req, res);
  },

  update(req, res) {
    return AuthController.updateStaff(req, res);
  },

  remove(req, res) {
    return AuthController.deleteStaff(req, res);
  },

  async getById(req, res) {
    try {
      const user = await User.findOne({
        _id: req.params.id,
        businessId: req.businessId,
        role: 'staff',
      }).select('-password');

      if (!user) {
        return res.status(404).json({ message: 'Staff user not found' });
      }

      res.json(user);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async getAssignments(req, res) {
    try {
      const scope = buildTenantScope(req.businessId);
      const staffId = req.params.id;
      const [orders, appointments, conversations] = await Promise.all([
        Order.countDocuments({ ...scope, assignedTo: staffId }),
        Appointment.countDocuments({ ...scope, assignedTo: staffId }),
        Conversation.countDocuments({ ...scope, assignedTo: staffId, status: { $ne: 'closed' } }),
      ]);

      res.json({
        staffId,
        assignments: {
          orders,
          appointments,
          conversations,
          total: orders + appointments + conversations,
        },
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};

export default AdminStaffController;
