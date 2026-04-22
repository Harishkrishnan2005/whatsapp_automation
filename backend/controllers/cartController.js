import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import OrderService from '../services/orderService.js';
import buildTenantScope from '../utils/tenantScope.js';

class CartController {
  async getCart(req, res) {
    try {
      const { customerId } = req.query;
      const businessId = req.businessId;

      if (!customerId) {
        return res.status(400).json({ message: 'customerId is required' });
      }

      const cart = await Cart.findOne({ customerId, businessId });
      if (!cart) {
        return res.json({ items: [], totalAmount: 0 });
      }

      res.json(cart);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async addToCart(req, res) {
    try {
      const { customerId, productId, quantity = 1 } = req.body;
      const businessId = req.businessId;

      if (!customerId || !productId) {
        return res.status(400).json({ message: 'customerId and productId are required' });
      }

      const product = await Product.findOne({ _id: productId, ...buildTenantScope(businessId) });
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      let cart = await Cart.findOne({ customerId, businessId });
      if (!cart) {
        cart = new Cart({ customerId, businessId, items: [] });
      }

      const existingItemIndex = cart.items.findIndex(item => String(item.productId) === String(productId));
      if (existingItemIndex > -1) {
        cart.items[existingItemIndex].quantity += Number(quantity);
      } else {
        cart.items.push({
          productId,
          name: product.name,
          price: product.offerPrice || product.mrp,
          quantity: Number(quantity)
        });
      }

      await cart.save();
      res.json(cart);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async removeFromCart(req, res) {
    try {
      const { customerId, productId } = req.body;
      const businessId = req.businessId;

      if (!customerId || !productId) {
        return res.status(400).json({ message: 'customerId and productId are required' });
      }

      const cart = await Cart.findOne({ customerId, businessId });
      if (!cart) {
        return res.status(404).json({ message: 'Cart not found' });
      }

      cart.items = cart.items.filter(item => String(item.productId) !== String(productId));
      await cart.save();
      res.json(cart);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async checkout(req, res) {
    try {
      const { customerId, address } = req.body;
      const businessId = req.businessId;

      if (!customerId) {
        return res.status(400).json({ message: 'customerId is required' });
      }

      const cart = await Cart.findOne({ customerId, businessId });
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ message: 'Cart is empty' });
      }

      const orderData = {
        businessId,
        customerId,
        items: cart.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price
        })),
        amount: cart.totalAmount,
        address: address || '',
        paymentType: 'COD'
      };

      const result = await OrderService.createOrder(orderData);

      // Clear cart after checkout
      await Cart.deleteOne({ _id: cart._id });

      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new CartController();
