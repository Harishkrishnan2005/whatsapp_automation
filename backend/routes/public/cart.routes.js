import express from 'express';
import PublicCartController from '../../controllers/public/cart.controller.js';
import { allowPublicBusinessType, publicBusinessContext } from '../../middlewares/publicBusinessContext.js';

const router = express.Router();

router.use(publicBusinessContext, allowPublicBusinessType('E_COMMERCE'));
router.post('/add', PublicCartController.add);
router.get('/view', PublicCartController.view);
router.delete('/clear', PublicCartController.clear);

export default router;

