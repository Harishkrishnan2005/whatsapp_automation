import mongoose from 'mongoose';
import OrderService from '../services/orderService.js';

class OrderController {
  async getOrders(req, res) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const scopeBusinessId = req.user?.role === 'admin' ? undefined : req.user.businessId;
      const filters = {
        orderStatus: req.query.orderStatus || '',
        paymentStatus: req.query.paymentStatus || '',
        paymentType: req.query.paymentType || '',
      };
      const options = {};
      if (req.user?.role === 'staff') {
        options.assignedTo = req.user.id;
      }

      const result = await OrderService.getOrders(scopeBusinessId, page, limit, filters, options);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async createOrder(req, res) {
    try {
      const {
        customerId,
        productId,
        product,
        amount,
        price,
        quantity,
        category,
        redirectUrl,
        paymentType,
        address,
      } = req.body;

      const result = await OrderService.createOrder({
        customerId,
        productId,
        product,
        amount,
        price,
        quantity,
        category,
        redirectUrl,
        paymentType,
        address,
        businessId: req.user.businessId,
      });

      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async verifyPayment(req, res) {
    try {
      const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

      const updated = await OrderService.verifyPayment({
        businessId: req.user.businessId,
        orderId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      });

      res.json({
        message: 'Payment verified successfully',
        order: updated,
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { orderStatus, status } = req.body;
      const nextStatus = orderStatus || status;
      const scopeBusinessId = req.user?.role === 'admin' ? undefined : req.user.businessId;

      if (req.user?.role === 'staff') {
        const existingOrder = await OrderService.getOrderById(scopeBusinessId, id);
        if (!existingOrder) {
          return res.status(404).json({ message: 'Order not found' });
        }

        if (!existingOrder.assignedTo || String(existingOrder.assignedTo) !== String(req.user.id)) {
          return res.status(403).json({ message: 'You can update only your assigned orders' });
        }
      }

      const order = await OrderService.updateOrderStatus(scopeBusinessId, id, nextStatus);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updatePaymentStatus(req, res) {
    try {
      const { id } = req.params;
      const { paymentStatus } = req.body;
      const scopeBusinessId = req.user?.role === 'admin' ? undefined : req.user.businessId;

      if (req.user?.role === 'staff') {
        const existingOrder = await OrderService.getOrderById(scopeBusinessId, id);
        if (!existingOrder) {
          return res.status(404).json({ message: 'Order not found' });
        }

        if (!existingOrder.assignedTo || String(existingOrder.assignedTo) !== String(req.user.id)) {
          return res.status(403).json({ message: 'You can update only your assigned orders' });
        }
      }

      const order = await OrderService.updatePaymentStatus(scopeBusinessId, id, paymentStatus);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async assignOrder(req, res) {
    try {
      const { id } = req.params;
      const { assignedTo } = req.body;
      if (!assignedTo) {
        return res.status(400).json({ message: 'assignedTo is required' });
      }

      const order = await OrderService.assignOrder(req.user.businessId, id, assignedTo);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async cancelOrder(req, res) {
    try {
      const { id } = req.params;
      const { reason = '' } = req.body;

      const order = await OrderService.cancelOrder({
        businessId: req.user.businessId,
        orderId: id,
        reason,
      });

      res.json({ message: 'Order cancelled', order });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async requestReturn(req, res) {
    try {
      const { id } = req.params;
      const { reason = '' } = req.body;

      const order = await OrderService.requestReturn({
        businessId: req.user.businessId,
        orderId: id,
        reason,
      });

      res.json({ message: 'Return requested', order });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async approveReturn(req, res) {
    try {
      const { id } = req.params;
      const { refundOnline = true } = req.body;

      const order = await OrderService.approveReturn({
        businessId: req.user.businessId,
        orderId: id,
        refundOnline,
      });

      res.json({ message: 'Return approved', order });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
}

export default new OrderController();
