import Session from '../models/Session.js';

/**
 * Production-grade Session Service for Multi-Tenant Chatbot
 * 
 * Features:
 * - Persistent session management
 * - Session expiry (10 minutes timeout)
 * - Context management
 * - Reset/restart commands
 * - Multi-business isolation
 * - Fault-tolerant design
 * 
 * Usage:
 *   const session = await SessionService.getOrCreateSession(phone, businessId);
 *   await SessionService.updateSession(session, { step: 'menu', context: {...} });
 *   await SessionService.resetSession(session);
 */

class SessionService {
  // Session timeout in milliseconds (10 minutes)
  static SESSION_TIMEOUT = 10 * 60 * 1000;

  /**
   * Get or create a session for a user
   * 
   * @param {string} phone - User phone number
   * @param {string} businessId - Business MongoDB ObjectId
   * @returns {Promise<Session>} Session document
   * 
   * @example
   *   const session = await SessionService.getOrCreateSession('1234567890', businessId);
   */
  static async getOrCreateSession(phone, businessId) {
    try {
      // Try to find existing session
      let session = await Session.findOne({
        phone: String(phone).trim(),
        businessId,
      });

      // Create new session if doesn't exist
      if (!session) {
        session = await Session.create({
          phone: String(phone).trim(),
          businessId,
          step: 'start',
          context: {},
          lastMessage: '',
          updatedAt: new Date(),
        });

        console.log(`[SessionService] New session created: ${phone} (${businessId})`);
      }

      return session;
    } catch (error) {
      console.error('[SessionService] getOrCreateSession error:', error.message);
      throw new Error(`Session creation failed: ${error.message}`);
    }
  }

  /**
   * Check if session has expired (10 minutes)
   * 
   * @param {Session} session - Session document
   * @returns {boolean} True if expired
   * 
   * @example
   *   if (SessionService.isSessionExpired(session)) {
   *     await SessionService.resetSession(session);
   *   }
   */
  static isSessionExpired(session) {
    if (!session || !session.updatedAt) {
      return true;
    }

    const currentTime = Date.now();
    const lastUpdateTime = new Date(session.updatedAt).getTime();
    const timeDifference = currentTime - lastUpdateTime;

    return timeDifference > this.SESSION_TIMEOUT;
  }

  /**
   * Get session expiry info
   * 
   * @param {Session} session - Session document
   * @returns {Object} { isExpired, remainingTime, expiresAt }
   * 
   * @example
   *   const expiry = SessionService.getExpiryInfo(session);
   *   console.log(`Expires in ${expiry.remainingTime}ms`);
   */
  static getExpiryInfo(session) {
    const currentTime = Date.now();
    const lastUpdateTime = new Date(session.updatedAt).getTime();
    const expiresAt = new Date(lastUpdateTime + this.SESSION_TIMEOUT);
    const remainingTime = expiresAt.getTime() - currentTime;

    return {
      isExpired: remainingTime <= 0,
      remainingTime: Math.max(0, remainingTime),
      expiresAt,
      lastUpdated: new Date(session.updatedAt),
    };
  }

  /**
   * Update session with new data
   * 
   * @param {Session} session - Session document
   * @param {Object} data - Update data { step, context, lastMessage }
   * @returns {Promise<Session>} Updated session
   * 
   * @example
   *   await SessionService.updateSession(session, {
   *     step: 'menu',
   *     context: { name: 'John', product: 'Rice' }
   *   });
   */
  static async updateSession(session, data = {}) {
    try {
      // Update fields
      if (data.step !== undefined) session.step = data.step;
      if (data.context !== undefined) {
        session.context = {
          ...session.context,
          ...data.context,
        };
      }
      if (data.lastMessage !== undefined) session.lastMessage = data.lastMessage;

      // Always update timestamp
      session.updatedAt = new Date();

      await session.save();

      return session;
    } catch (error) {
      console.error('[SessionService] updateSession error:', error.message);
      throw new Error(`Session update failed: ${error.message}`);
    }
  }

  /**
   * Reset session to initial state (step = 'start', context = {})
   * 
   * @param {Session} session - Session document
   * @returns {Promise<Session>} Reset session
   * 
   * @example
   *   await SessionService.resetSession(session);
   */
  static async resetSession(session) {
    try {
      session.step = 'start';
      session.context = {};
      session.lastMessage = '';
      session.updatedAt = new Date();

      await session.save();

      console.log(`[SessionService] Session reset: ${session.phone}`);

      return session;
    } catch (error) {
      console.error('[SessionService] resetSession error:', error.message);
      throw new Error(`Session reset failed: ${error.message}`);
    }
  }

  /**
   * Handle automatic expiry reset
   * 
   * @param {Session} session - Session document
   * @returns {Promise<Session>} Session (reset if expired, unchanged otherwise)
   * 
   * @example
   *   const session = await SessionService.handleExpiryReset(session);
   */
  static async handleExpiryReset(session) {
    if (this.isSessionExpired(session)) {
      console.log(`[SessionService] Session expired, resetting: ${session.phone}`);
      return await this.resetSession(session);
    }
    return session;
  }

  /**
   * Set context value (deep merge)
   * 
   * @param {Session} session - Session document
   * @param {string} key - Context key (dot-notation: "user.name")
   * @param {any} value - Context value
   * @returns {Promise<Session>} Updated session
   * 
   * @example
   *   await SessionService.setContextValue(session, 'customerName', 'John');
   *   await SessionService.setContextValue(session, 'order.productId', '123abc');
   */
  static async setContextValue(session, key, value) {
    try {
      const keys = key.split('.');
      let current = session.context;

      // Navigate to parent object
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      // Set value
      current[keys[keys.length - 1]] = value;
      session.updatedAt = new Date();

      await session.save();

      return session;
    } catch (error) {
      console.error('[SessionService] setContextValue error:', error.message);
      throw new Error(`Failed to set context value: ${error.message}`);
    }
  }

  /**
   * Get context value (supports dot-notation)
   * 
   * @param {Session} session - Session document
   * @param {string} key - Context key (dot-notation: "user.name")
   * @param {any} defaultValue - Default value if not found
   * @returns {any} Context value
   * 
   * @example
   *   const name = SessionService.getContextValue(session, 'customerName');
   *   const productId = SessionService.getContextValue(session, 'order.productId');
   */
  static getContextValue(session, key, defaultValue = null) {
    try {
      const keys = key.split('.');
      let current = session.context;

      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          return defaultValue;
        }
      }

      return current;
    } catch (error) {
      console.error('[SessionService] getContextValue error:', error.message);
      return defaultValue;
    }
  }

  /**
   * Interpolate template with session context
   * 
   * @param {string} template - Template string with {{key}} placeholders
   * @param {Session} session - Session document
   * @returns {string} Interpolated string
   * 
   * @example
   *   const msg = SessionService.interpolateTemplate(
   *     'Hi {{name}}, your product is {{product}}',
   *     session
   *   );
   *   // Output: "Hi John, your product is Rice"
   */
  static interpolateTemplate(template, session) {
    if (!template || typeof template !== 'string') {
      return template;
    }

    try {
      let result = template;

      // Match all {{key}} patterns
      const regex = /\{\{([^}]+)\}\}/g;
      const matches = result.matchAll(regex);

      for (const match of matches) {
        const key = match[1];
        const value = this.getContextValue(session, key.trim(), `{{${key}}}`);
        result = result.replace(match[0], String(value || ''));
      }

      return result;
    } catch (error) {
      console.error('[SessionService] interpolateTemplate error:', error.message);
      return template;
    }
  }

  /**
   * Get session metadata for logging/analytics
   * 
   * @param {Session} session - Session document
   * @returns {Object} Session metadata
   * 
   * @example
   *   const metadata = SessionService.getSessionMetadata(session);
   *   console.log(metadata);
   */
  static getSessionMetadata(session) {
    const expiry = this.getExpiryInfo(session);

    return {
      phone: session.phone,
      businessId: session.businessId,
      currentStep: session.step,
      contextKeys: Object.keys(session.context || {}),
      lastMessage: session.lastMessage,
      updatedAt: session.updatedAt,
      expiryInfo: {
        isExpired: expiry.isExpired,
        remainingMinutes: Math.floor(expiry.remainingTime / 60000),
        expiresAt: expiry.expiresAt,
      },
    };
  }

  /**
   * Clear specific context values
   * 
   * @param {Session} session - Session document
   * @param {Array<string>} keys - Keys to clear
   * @returns {Promise<Session>} Updated session
   * 
   * @example
   *   await SessionService.clearContext(session, ['orderId', 'productId']);
   */
  static async clearContext(session, keys = []) {
    try {
      for (const key of keys) {
        delete session.context[key];
      }
      session.updatedAt = new Date();
      await session.save();
      return session;
    } catch (error) {
      console.error('[SessionService] clearContext error:', error.message);
      throw new Error(`Failed to clear context: ${error.message}`);
    }
  }

  /**
   * Get or create session and check expiry
   * Safe wrapper for common pattern
   * 
   * @param {string} phone - User phone number
   * @param {string} businessId - Business MongoDB ObjectId
   * @returns {Promise<Session>} Session (auto-reset if expired)
   * 
   * @example
   *   const session = await SessionService.getSessionSafe(phone, businessId);
   */
  static async getSessionSafe(phone, businessId) {
    let session = await this.getOrCreateSession(phone, businessId);
    session = await this.handleExpiryReset(session);
    return session;
  }
}

export default SessionService;
