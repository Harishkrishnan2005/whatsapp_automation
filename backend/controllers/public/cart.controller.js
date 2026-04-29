import CartController from '../cartController.js';

const PublicCartController = {
  add(req, res) {
    return CartController.addToCart(req, res);
  },
  view(req, res) {
    return CartController.getCart(req, res);
  },
  clear(req, res) {
    return CartController.removeFromCart(req, res); // Adjusting based on common patterns
  }
};

export default PublicCartController;
