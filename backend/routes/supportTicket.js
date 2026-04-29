import express from 'express';
import SupportTicketController from '../controllers/supportTicketController.js';
import { authenticateToken, isAdmin } from '../middlewares/authorization.js';
import { businessContext } from '../middlewares/bussinessContext.js';
import { requireSupportAccess } from '../middlewares/staffRbac.js';

const router = express.Router();

router.use(authenticateToken);
router.use(businessContext);
router.use(requireSupportAccess);

router.get('/', SupportTicketController.getTickets);
router.get('/:id', SupportTicketController.getTicketById);
router.post('/', SupportTicketController.createTicket);
router.post('/:id/reply', SupportTicketController.replyToTicket);
router.put('/:id/status', SupportTicketController.updateStatus);
router.patch('/:id', SupportTicketController.updateStatus);
router.put('/:id/assign', isAdmin, SupportTicketController.assignTicket);

export default router;
