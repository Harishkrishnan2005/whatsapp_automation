import ChatSession from '../models/ChatSession.js';
import Customer from '../models/Customer.js';

class SessionManager {
  buildSessionLookup(phone, businessId) {
    const normalizedPhone = String(phone || '').trim();
    const resolvedBusinessId = businessId?._id || businessId;

    return {
      phone: normalizedPhone,
      $or: [
        { tenantId: resolvedBusinessId },
        { businessId: resolvedBusinessId },
      ],
    };
  }

  /**
   * Get or create a session and ensure customer existence
   */
  async getSession(phone, businessId) {
    const normalizedPhone = String(phone || '').trim();
    const resolvedBusinessId = businessId?._id || businessId;
    const sessionLookup = this.buildSessionLookup(normalizedPhone, resolvedBusinessId);
    
    // Ensure customer exists
    let customer = await Customer.findOne({ phone: normalizedPhone, businessId: resolvedBusinessId });
    if (!customer) {
      customer = await Customer.create({ 
        phone: normalizedPhone, 
        businessId: resolvedBusinessId, 
        tenantId: resolvedBusinessId,
        status: 'new' 
      });
    }

    let session = await ChatSession.findOne(sessionLookup);
    if (!session) {
      try {
        session = await ChatSession.create({
          phone: normalizedPhone,
          businessId: resolvedBusinessId,
          tenantId: resolvedBusinessId,
          customerId: customer._id,
          currentStep: 'start',
          mode: 'BOT',
          retryCount: 0,
          collectedData: {},
          context: {},
          lastInteractionAt: new Date()
        });
      } catch (error) {
        if (error?.code === 11000) {
          session = await ChatSession.findOne(sessionLookup);
        } else {
          throw error;
        }
      }
    }

    if (!session) {
      throw new Error(`Failed to create or load session for ${normalizedPhone}`);
    }

    const repairUpdates = {};

    if (!session.businessId) {
      repairUpdates.businessId = resolvedBusinessId;
    }

    if (!session.tenantId) {
      repairUpdates.tenantId = resolvedBusinessId;
    }

    if (!session.customerId && customer?._id) {
      repairUpdates.customerId = customer._id;
    }

    if (Object.keys(repairUpdates).length > 0) {
      session = await ChatSession.findByIdAndUpdate(
        session._id,
        { $set: repairUpdates },
        { new: true, runValidators: true }
      );
    }

    return { session, customer };
  }

  /**
   * Update session state after a turn
   */
  async updateSession(session, updates = {}) {
    if (!session.tenantId) {
      session.tenantId = session.businessId;
    }

    if (!session.businessId && session.tenantId) {
      session.businessId = session.tenantId;
    }

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
    const normalizedPhone = String(phone || '').trim();
    const resolvedBusinessId = businessId?._id || businessId;

    return await ChatSession.findOneAndUpdate(
      this.buildSessionLookup(normalizedPhone, resolvedBusinessId),
      {
        $set: {
          mode,
          lastInteractionAt: new Date(),
          businessId: resolvedBusinessId,
          tenantId: resolvedBusinessId,
        },
      },
      { new: true }
    );
  }
}

export default new SessionManager();
