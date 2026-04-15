import express from 'express';
const router = express.Router();
import noteController from '../controllers/noteController.js';
import { authenticateToken } from '../middlewares/auth.js';

// All routes require authentication
router.use(authenticateToken);

router.post('/', noteController.createNote);
router.get('/:customerId', noteController.getNotesByCustomer);
router.delete('/:id', noteController.deleteNote);

export default router;