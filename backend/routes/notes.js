import express from 'express';
const router = express.Router();
import noteController from '../controllers/noteController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { businessContext } from '../middlewares/bussinessContext.js';

// All routes require authentication
router.use(authenticateToken);
router.use(businessContext);

router.post('/', noteController.createNote);
router.get('/:customerId', noteController.getNotesByCustomer);
router.delete('/:id', noteController.deleteNote);

export default router;
