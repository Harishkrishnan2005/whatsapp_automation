import * as SubscriptionController from '../subscriptionController.js';
import Subscription from '../../models/Subscription.js';

const AdminBillingController = {
  getDashboard(req, res) {
    return SubscriptionController.getSubscriptionStatus(req, res);
  },
  async getInvoices(req, res) {
    try {
      const subscriptions = await Subscription.find({ 
        businessId: req.businessId,
        paymentStatus: 'PAID' 
      }).sort({ createdAt: -1 });
      res.json(subscriptions);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  getSubscription(req, res) {
    return SubscriptionController.getSubscriptionStatus(req, res);
  },
  createSubscription(req, res) {
    return SubscriptionController.createSubscription(req, res);
  },
  verifySubscription(req, res) {
    return SubscriptionController.verifyPayment(req, res);
  }
};

export default AdminBillingController;
