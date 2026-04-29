import ChatSession from '../models/ChatSession.js';

class ChatSessionService {
  SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;

  normalizeBusinessId(businessId) {
    return businessId?._id || businessId;
  }

  normalizePhone(phone) {
    return String(phone || '').trim();
  }

  isSessionActive(lastMessageAt) {
    if (!lastMessageAt) {
      return false;
    }

    return (Date.now() - new Date(lastMessageAt).getTime()) <= this.SESSION_WINDOW_MS;
  }

  async getOrCreateChatSession({ businessId, customerId = null, phone = '', currentStep = 'START' }) {
    const resolvedBusinessId = this.normalizeBusinessId(businessId);
    const normalizedPhone = this.normalizePhone(phone);

    let chatSession = await ChatSession.findOne({
      tenantId: resolvedBusinessId,
      phone: normalizedPhone,
    });

    if (!chatSession) {
      chatSession = await ChatSession.create({
        phone: normalizedPhone,
        businessId: resolvedBusinessId,
        tenantId: resolvedBusinessId,
        customerId,
        currentStep,
        currentNode: currentStep,
        lastInteractionAt: new Date(),
        lastMessageAt: null,
        sessionActive: false,
      });
    }

    let shouldSave = false;

    if (String(chatSession.businessId) !== String(resolvedBusinessId)) {
      chatSession.businessId = resolvedBusinessId;
      shouldSave = true;
    }

    if (String(chatSession.tenantId) !== String(resolvedBusinessId)) {
      chatSession.tenantId = resolvedBusinessId;
      shouldSave = true;
    }

    if (customerId && String(chatSession.customerId || '') !== String(customerId)) {
      chatSession.customerId = customerId;
      shouldSave = true;
    }

    const nextSessionActive = this.isSessionActive(chatSession.lastMessageAt);
    if (chatSession.sessionActive !== nextSessionActive) {
      chatSession.sessionActive = nextSessionActive;
      shouldSave = true;
    }

    if (shouldSave) {
      await chatSession.save();
    }

    return chatSession;
  }

  async syncFlowState(chatSession, payload = {}) {
    if (!chatSession) {
      return null;
    }

    const {
      phone,
      currentStep,
      currentNode,
      context,
      collectedData,
      mode = 'BOT',
      customerId,
    } = payload;

    if (phone !== undefined) {
      chatSession.phone = this.normalizePhone(phone);
    }

    if (customerId !== undefined) {
      chatSession.customerId = customerId;
    }

    if (currentStep !== undefined) {
      chatSession.currentStep = currentStep;
    }

    if (currentNode !== undefined) {
      chatSession.currentNode = currentNode;
    }

    if (context !== undefined) {
      chatSession.context = context;
      chatSession.markModified('context');
    }

    if (collectedData !== undefined) {
      chatSession.collectedData = collectedData;
      chatSession.markModified('collectedData');
    }

    chatSession.mode = mode;
    chatSession.lastInteractionAt = new Date();
    chatSession.sessionActive = this.isSessionActive(chatSession.lastMessageAt);

    await chatSession.save();
    return chatSession;
  }

  async markIncomingCustomerMessage(chatSession, timestamp = new Date()) {
    if (!chatSession) {
      return null;
    }

    chatSession.lastMessageAt = timestamp;
    chatSession.lastInteractionAt = timestamp;
    chatSession.sessionActive = true;
    await chatSession.save();
    return chatSession;
  }

  async refreshWindow(chatSession) {
    if (!chatSession) {
      return null;
    }

    const nextActive = this.isSessionActive(chatSession.lastMessageAt);
    if (chatSession.sessionActive !== nextActive) {
      chatSession.sessionActive = nextActive;
      await chatSession.save();
    }

    return chatSession;
  }

  getWindowState(chatSession) {
    const sessionActive = this.isSessionActive(chatSession?.lastMessageAt);
    return {
      sessionActive,
      lastMessageAt: chatSession?.lastMessageAt || null,
      windowExpiresAt: chatSession?.lastMessageAt
        ? new Date(new Date(chatSession.lastMessageAt).getTime() + this.SESSION_WINDOW_MS)
        : null,
    };
  }
}

export default new ChatSessionService();
