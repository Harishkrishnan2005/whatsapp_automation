import OrderController from '../orderController.js';

const PublicOrderController = {
  create(req, res) {
    return OrderController.createOrder(req, res);
  },
  confirm(req, res) {
    return OrderController.updateOrderStatus(req, res);
  },
  payment(req, res) {
    return OrderController.verifyPayment(req, res);
  }
};

export default PublicOrderController;
