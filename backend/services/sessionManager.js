import ChatSession from '../models/ChatSession.js';
import Customer from '../models/Customer.js';
import mongoose from 'mongoose';

class SessionManager {
  /**
   * Get or create a session and ensure customer existence
   */
  async getSession(phone, businessId) {
    const normalizedPhone = String(phone || '').trim();
    
    // Ensure customer exists
    let customer = await Customer.findOne({ phone: normalizedPhone, businessId });
    if (!customer) {
      customer = await Customer.create({ 
        phone: normalizedPhone, 
        businessId, 
        tenantId: businessId,
        status: 'new' 
      });
    }

    let session = await ChatSession.findOne({ phone: normalizedPhone, businessId });
    if (!session) {
      session = await ChatSession.create({
        phone: normalizedPhone,
        businessId,
        customerId: customer._id,
        currentStep: 'start',
        mode: 'BOT',
        collectedData: {},
        context: {},
        lastInteractionAt: new Date()
      });
    }

    return { session, customer };
  }

  /**
   * Update session state after a turn
   */
  async updateSession(session, updates = {}) {
    Object.assign(session, updates);
    session.lastInteractionAt = new Date();
    
    if (updates.collectedData) {
      session.markModified('collectedData');
    }
    if (updates.context) {
      session.markModified('context');
    }

    return await session.save();
  }

  /**
   * Check if the session is within the 24-hour WhatsApp window
   */
  isWithin24Hours(session) {
    if (!session.lastInteractionAt) return false;
    const now = new Date();
    const lastInteraction = new Date(session.lastInteractionAt);
    const diffInHours = (now - lastInteraction) / (1000 * 60 * 60);
    return diffInHours < 24;
  }

  async setMode(phone, businessId, mode) {
    return await ChatSession.findOneAndUpdate(
      { phone, businessId },
      { mode, lastInteractionAt: new Date() },
      { new: true }
    );
  }
}

export default new SessionManager();
