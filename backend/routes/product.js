import express from 'express';
import ProductController from '../controllers/productController.js';
import { authenticateToken, isAdmin } from '../middlewares/authorization.js';
import { checkBusinessType } from '../middlewares/businessType.js';

const router = express.Router();

router.use(authenticateToken);
router.use(checkBusinessType('E_COMMERCE'));

router.post('/', isAdmin, ProductController.createProduct);
router.get('/', ProductController.getProducts);
router.put('/:id', isAdmin, ProductController.updateProduct);
router.delete('/:id', isAdmin, ProductController.deleteProduct);

export default router;
