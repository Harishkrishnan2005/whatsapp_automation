import mongoose from 'mongoose';
import OrderController from '../orderController.js';
import Order from '../../models/Order.js';
import buildTenantScope from '../../utils/tenantScope.js';

const AdminOrdersController = {
  list(req, res) {
    return OrderController.getOrders(req, res);
  },

  create(req, res) {
    return OrderController.createOrder(req, res);
  },

  async getById(req, res) {
    try {
      const order = await Order.findOne({
        _id: req.params.id,
        ...buildTenantScope(req.businessId),
      })
        .populate('customerId', 'name phone')
        .populate('assignedTo', 'name email')
        .lean();

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.json(order);
    } catch (error) {
      const status = mongoose.Types.ObjectId.isValid(req.params.id) ? 500 : 400;
      res.status(status).json({ message: error.message });
    }
  },

  updateStatus(req, res) {
    return OrderController.updateOrderStatus(req, res);
  },

  updatePayment(req, res) {
    return OrderController.updatePaymentStatus(req, res);
  },

  async getMetricsSummary(req, res) {
    try {
      const tenantScope = buildTenantScope(req.businessId);
      const [totalOrders, paidOrders, pendingOrders, cancelledOrders, deliveredOrders, paidRevenue] = await Promise.all([
        Order.countDocuments(tenantScope),
        Order.countDocuments({ ...tenantScope, paymentStatus: 'Paid' }),
        Order.countDocuments({ ...tenantScope, orderStatus: 'Pending' }),
        Order.countDocuments({ ...tenantScope, orderStatus: 'Cancelled' }),
        Order.countDocuments({ ...tenantScope, orderStatus: 'Delivered' }),
        Order.aggregate([
          { $match: { ...tenantScope, paymentStatus: 'Paid' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);

      res.json({
        totalOrders,
        paidOrders,
        pendingOrders,
        cancelledOrders,
        deliveredOrders,
        revenue: Number(paidRevenue[0]?.total || 0),
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};

export default AdminOrdersController;
