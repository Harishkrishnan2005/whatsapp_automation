import express from 'express';
import ProductController from '../controllers/productController.js';
import { authenticateToken, isAdmin } from '../middlewares/authorization.js';
import { checkBusinessType } from '../middlewares/businessType.js';
import { businessContext } from '../middlewares/bussinessContext.js';
import { upload } from '../utils/cloudinary.js';

const router = express.Router();

router.use(authenticateToken);
router.use(businessContext);
router.use(checkBusinessType('E_COMMERCE'));

router.post('/', isAdmin, upload.single('image'), ProductController.createProduct);
router.get('/', ProductController.getProducts);
router.put('/:id', isAdmin, upload.single('image'), ProductController.updateProduct);
router.delete('/:id', isAdmin, ProductController.deleteProduct);

export default router;
