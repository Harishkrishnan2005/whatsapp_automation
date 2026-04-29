import Conversation from '../../models/Conversation.js';
import Customer from '../../models/Customer.js';
import ChatSession from '../../models/ChatSession.js';
import Message from '../../models/Message.js';
import WebhookController from '../webhookController.js';
import buildTenantScope from '../../utils/tenantScope.js';

const PublicChatController = {
  start(req, res) {
    req.body = { ...(req.body || {}), businessId: req.businessId };
    return WebhookController.handleSimulatorWebhook(req, res);
  },

  message(req, res) {
    req.body = { ...(req.body || {}), businessId: req.businessId };
    return WebhookController.handleSimulatorWebhook(req, res);
  },

  async getHistory(req, res) {
    try {
      const phone = String(req.query?.phone || '').trim();

      if (!phone) {
        return res.status(400).json({ message: 'phone is required' });
      }

      const [conversation, session, customer] = await Promise.all([
        Conversation.findOne({ phone, ...buildTenantScope(req.businessId) }).sort({ updatedAt: -1, createdAt: -1 }).lean(),
        ChatSession.findOne({ phone, ...buildTenantScope(req.businessId) }).sort({ updatedAt: -1, createdAt: -1 }).lean(),
        Customer.findOne({ phone, ...buildTenantScope(req.businessId) }).select('name phone').lean(),
      ]);

      let hydratedConversation = conversation;

      if (conversation?._id) {
        const messages = await Message.find({
          conversationId: conversation._id,
          ...buildTenantScope(req.businessId),
        })
          .sort({ createdAt: 1 })
          .select('content message senderType createdAt products type')
          .lean();

        hydratedConversation = {
          ...conversation,
          messages: messages.map((message, index) => ({
            _id: message._id || `${message.createdAt || index}-${index}`,
            text: message.content || message.message || '',
            sender: message.senderType === 'chatbot' ? 'bot' : message.senderType,
            timestamp: message.createdAt,
            products: Array.isArray(message.products) ? message.products : [],
            type: message.type || 'text',
          })),
        };
      }

      return res.json({
        phone,
        customer: customer || null,
        session: session || null,
        conversation: hydratedConversation || null,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  async getSession(req, res) {
    try {
      const id = req.params.id;
      const [session, conversation] = await Promise.all([
        ChatSession.findOne({ _id: id, ...buildTenantScope(req.businessId) }).lean().catch(() => null),
        Conversation.findOne({ _id: id, ...buildTenantScope(req.businessId) })
          .populate('customerId', 'name phone')
          .lean()
          .catch(() => null),
      ]);

      if (!session && !conversation) {
        return res.status(404).json({ message: 'Session not found' });
      }

      let customer = conversation?.customerId || null;
      if (!customer && session?.customerId) {
        customer = await Customer.findOne({ _id: session.customerId, ...buildTenantScope(req.businessId) })
          .select('name phone')
          .lean();
      }

      res.json({
        session: session || null,
        conversation: conversation || null,
        customer,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};

export default PublicChatController;
