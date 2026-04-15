import express from 'express';
import ProductController from '../controllers/productController.js';
import { authenticateToken, isAdmin } from '../middlewares/authorization.js';

const router = express.Router();

router.post('/', authenticateToken, isAdmin, ProductController.createProduct);
router.get('/', authenticateToken, ProductController.getProducts);
router.put('/:id', authenticateToken, isAdmin, ProductController.updateProduct);
router.delete('/:id', authenticateToken, isAdmin, ProductController.deleteProduct);

export default router;
