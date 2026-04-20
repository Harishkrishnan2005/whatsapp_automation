import express from 'express';
import SupportTicketController from '../controllers/supportTicketController.js';
import { authenticateToken, isAdmin } from '../middlewares/authorization.js';
import { businessContext } from '../middlewares/bussinessContext.js';

const router = express.Router();

router.use(authenticateToken);
router.use(businessContext);

router.get('/', SupportTicketController.getTickets);
router.get('/:id', SupportTicketController.getTicketById);
router.post('/:id/reply', isAdmin, SupportTicketController.replyToTicket);
router.put('/:id/status', isAdmin, SupportTicketController.updateStatus);
router.patch('/:id', isAdmin, SupportTicketController.updateStatus);

export default router;
