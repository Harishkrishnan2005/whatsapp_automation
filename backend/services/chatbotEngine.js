import mongoose from 'mongoose';
import ChatbotFlow from '../models/ChatbotFlow.js';
import ChatSession from '../models/ChatSession.js';

const normalize = (text) => String(text || '').toLowerCase().trim();
const defaultReply = 'Sorry, I did not understand that. Please try again.';
const splitTriggers = (value) =>
  String(value || '')
    .split(/[,\n]/)
    .map((item) => normalize(item))
    .filter(Boolean);

class ChatbotEngine {
  async buildLegacyReply({ flow, session, message }) {
    const normalizedMessage = normalize(message);
    const triggerMatch = splitTriggers(flow.trigger || '');

    if (!triggerMatch.includes(normalizedMessage)) {
      return {
        response: defaultReply,
        text: defaultReply,
        type: 'text',
        products: [],
      };
    }

    const nextStep = String(flow.nextStep || session.currentNode || 'start').trim();
    session.currentNode = nextStep;
    await session.save();

    const reply = String(flow.reply || defaultReply).trim();
    return {
      response: reply,
      text: reply,
      type: 'text',
      products: [],
    };
  }

  async chatbotEngine({ message, phone, businessId }) {
    try {
      if (!businessId) {
        throw new Error('businessId is required');
      }

      if (!phone || !message) {
        return {
          response: 'Something went wrong',
          text: 'Something went wrong',
          type: 'text',
          products: [],
        };
      }

      const resolvedBusinessId = mongoose.Types.ObjectId.isValid(String(businessId))
        ? new mongoose.Types.ObjectId(String(businessId))
        : null;

      if (!resolvedBusinessId) {
        throw new Error('Invalid businessId');
      }

      console.log('Incoming message:', message);
      console.log('BusinessId:', String(resolvedBusinessId));

      const normalizedPhone = String(phone).trim();
      const normalizedMessage = normalize(message);

      let session = await ChatSession.findOne({
        phone: normalizedPhone,
        businessId: resolvedBusinessId,
      });

      if (!session) {
        session = await ChatSession.create({
          phone: normalizedPhone,
          businessId: resolvedBusinessId,
          currentNode: 'start',
        });
      }

      console.log('Session step:', session?.currentNode);

      const graphFlow = await ChatbotFlow.findOne({
        businessId: resolvedBusinessId,
        isActive: true,
        'nodes.0': { $exists: true },
      })
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean();

      if (graphFlow) {
        console.log('Flow found:', `graph:${graphFlow._id}`);

        const currentNode = graphFlow.nodes.find((node) => node.id === session.currentNode)
          || graphFlow.nodes.find((node) => node.type === 'start')
          || graphFlow.nodes[0];

        const matchedEdge = graphFlow.edges.find((edge) =>
          String(edge.source) === String(currentNode?.id) &&
          splitTriggers(edge.label || '').some((label) => normalizedMessage === label || normalizedMessage.includes(label))
        );

        console.log('Matched graph edge:', matchedEdge || null);

        const nextNode = matchedEdge
          ? graphFlow.nodes.find((node) => node.id === matchedEdge.target)
          : graphFlow.nodes.find((node) => node.type === 'fallback');

        if (!nextNode) {
          return {
            response: defaultReply,
            text: defaultReply,
            type: 'text',
            products: [],
          };
        }

        session.currentNode = nextNode.id;
        await session.save();

        const reply = String(nextNode.data?.message || defaultReply).trim();
        return {
          response: reply,
          text: reply,
          type: nextNode.data?.type || 'text',
          products: [],
        };
      }

      const legacyStepFlows = await ChatbotFlow.find({
        businessId: resolvedBusinessId,
        isActive: true,
        step: session.currentNode,
      })
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean()
      const legacyStartFlows = session.currentNode === 'start'
        ? []
        : await ChatbotFlow.find({
          businessId: resolvedBusinessId,
          isActive: true,
          step: 'start',
        })
          .sort({ updatedAt: -1, createdAt: -1 })
          .lean();

      const flow = [...legacyStepFlows, ...legacyStartFlows].find((candidate) =>
        splitTriggers(candidate.trigger).includes(normalizedMessage)
      );

      if (!flow) {
        const activeFlowCount = await ChatbotFlow.countDocuments({
          businessId: resolvedBusinessId,
          isActive: true,
        });

        console.log('Flow found:', null);
        console.log('Active flow count:', activeFlowCount);

        return {
          response: activeFlowCount > 0 ? defaultReply : 'No chatbot configured.',
          text: activeFlowCount > 0 ? defaultReply : 'No chatbot configured.',
          type: 'text',
          products: [],
        };
      }

      console.log('Flow found:', {
        id: String(flow._id),
        step: flow.step,
        trigger: flow.trigger,
      });
      return await this.buildLegacyReply({
        flow,
        session,
        message,
      });
    } catch (err) {
      console.error('[ChatbotEngine] Error:', err);
      return {
        response: 'Something went wrong',
        text: 'Something went wrong',
        type: 'text',
        products: [],
      };
    }
  }
}

export default new ChatbotEngine();
