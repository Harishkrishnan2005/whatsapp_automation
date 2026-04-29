import OrderController from '../orderController.js';
import Order from '../../models/Order.js';
import buildTenantScope from '../../utils/tenantScope.js';

const StaffOrdersController = {
  list(req, res) {
    return OrderController.getOrders(req, res);
  },

  async getById(req, res) {
    try {
      const order = await Order.findOne({
        _id: req.params.id,
        ...buildTenantScope(req.businessId),
        assignedTo: req.user.id,
      })
        .populate('customerId', 'name phone')
        .populate('assignedTo', 'name email')
        .lean();

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};

export default StaffOrdersController;
