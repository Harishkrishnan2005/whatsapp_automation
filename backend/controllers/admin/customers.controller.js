import CustomerController from '../customerController.js';
import Conversation from '../../models/Conversation.js';
import Order from '../../models/Order.js';
import buildTenantScope from '../../utils/tenantScope.js';

const AdminCustomersController = {
  list(req, res) {
    return CustomerController.getCustomers(req, res);
  },

  getById(req, res) {
    return CustomerController.getCustomerById(req, res);
  },

  async getOrders(req, res) {
    try {
      const orders = await Order.find({
        customerId: req.params.id,
        ...buildTenantScope(req.businessId),
      })
        .populate('customerId', 'name phone')
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 })
        .lean();

      res.json({ orders });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async getConversations(req, res) {
    try {
      const conversations = await Conversation.find({
        customerId: req.params.id,
        ...buildTenantScope(req.businessId),
      })
        .populate('customerId', 'name phone')
        .populate('assignedStaffId', 'name email')
        .sort({ updatedAt: -1 })
        .lean();

      res.json({ conversations });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};

export default AdminCustomersController;
