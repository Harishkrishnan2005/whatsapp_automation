import express from 'express';
import CartController from '../controllers/cartController.js';
import { businessContext } from '../middlewares/bussinessContext.js';

const router = express.Router();

// Publicly accessible for simulation, but uses businessContext
router.use(businessContext);

router.get('/', CartController.getCart);
router.post('/add', CartController.addToCart);
router.delete('/item', CartController.removeFromCart);
router.post('/checkout', CartController.checkout);

export default router;
