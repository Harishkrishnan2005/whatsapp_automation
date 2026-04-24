import express from 'express';
import Conversation from '../models/Conversation.js';
import Customer from '../models/Customer.js';
import ConversationService from '../services/conversationService.js';
import { businessContext } from '../middlewares/bussinessContext.js';

const router = express.Router();
router.use(businessContext);

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, q = '' } = req.query;
    const result = await ConversationService.listConversations(
      req.user,
      req.businessId,
      parseInt(page, 10),
      parseInt(limit, 10),
      q
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/id/:id', async (req, res) => {
  try {
    const conversation = await ConversationService.getConversationById(req.params.id, req.user, req.businessId);
    res.json(conversation);
  } catch (error) {
    const status = error.message.includes('access denied') ? 403 : 404;
    res.status(status).json({ message: error.message });
  }
});

router.get('/id/:id/messages', async (req, res) => {
  try {
    const conversation = await ConversationService.getConversationById(req.params.id, req.user, req.businessId);
    res.json({ messages: Array.isArray(conversation.messages) ? conversation.messages : [] });
  } catch (error) {
    const status = error.message.includes('access denied') ? 403 : 404;
    res.status(status).json({ message: error.message });
  }
});

router.post('/id/:id/messages', async (req, res) => {
  try {
    const { text } = req.body;
    const conversation = await ConversationService.sendMessage(req.params.id, text, req.user, req.businessId);
    res.status(201).json(conversation);
  } catch (error) {
    const status = error.message.includes('access denied') || error.message.includes('Unauthorized') ? 403 : 400;
    res.status(status).json({ message: error.message });
  }
});

router.put('/id/:id/read', async (req, res) => {
  try {
    await ConversationService.markAsRead(req.params.id, req.user, req.businessId);
    res.json({ message: 'Conversation marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/id/:id/close', async (req, res) => {
  try {
    const conversation = await ConversationService.closeConversation(req.params.id, req.user, req.businessId);
    res.json(conversation);
  } catch (error) {
    const status = error.message.includes('access denied') ? 403 : 404;
    res.status(status).json({ message: error.message });
  }
});

// Legacy phone-based lookup kept for simulation tooling.
router.get('/:phone', async (req, res) => {
  try {
    const phone = String(req.params.phone || '').trim();
    const baseQuery = { phone, businessId: req.businessId };

    if (req.user?.role === 'staff') {
      baseQuery.assignedStaffId = req.user.id || req.user._id;
    }

    const conversation = await Conversation.findOne(baseQuery)
      .populate('customerId', 'name phone assignedTo')
      .populate('assignedStaffId', 'name email')
      .lean();

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const customer =
      conversation.customerId ||
      await Customer.findOne({ phone, businessId: req.businessId }).select('name phone').lean();

    res.json({
      ...conversation,
      phone: String(conversation.phone || '').trim(),
      name: customer?.name || conversation?.customerId?.name || '',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
