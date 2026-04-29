import Session from '../models/Session.js';
import Customer from '../models/Customer.js';

class SessionService {
  static SESSION_TIMEOUT = 10 * 60 * 1000;

  static normalizePhone(phone) {
    return String(phone || '').trim();
  }

  static normalizeBusinessId(businessId) {
    return businessId?._id || businessId;
  }

  static async getOrCreateSession(phone, businessId, customer = null) {
    const normalizedPhone = this.normalizePhone(phone);
    const resolvedBusinessId = this.normalizeBusinessId(businessId);

    if (!normalizedPhone || !resolvedBusinessId) {
      throw new Error('phone and businessId are required');
    }

    let resolvedCustomer = customer;
    if (!resolvedCustomer) {
      resolvedCustomer = await Customer.findOne({
        phone: normalizedPhone,
        tenantId: resolvedBusinessId,
      });
    }

    if (!resolvedCustomer?._id) {
      throw new Error('Customer must exist before creating a session');
    }

    let session = await Session.findOne({
      phone: normalizedPhone,
      tenantId: resolvedBusinessId,
    });

    if (!session) {
      session = await Session.create({
        phone: normalizedPhone,
        businessId: resolvedBusinessId,
        tenantId: resolvedBusinessId,
        customerId: resolvedCustomer._id,
        currentStep: 'start',
        context: {},
        lastMessage: '',
      });
    }

    let needsSave = false;

    if (String(session.businessId) !== String(resolvedBusinessId)) {
      session.businessId = resolvedBusinessId;
      needsSave = true;
    }

    if (String(session.tenantId) !== String(resolvedBusinessId)) {
      session.tenantId = resolvedBusinessId;
      needsSave = true;
    }

    if (String(session.customerId || '') !== String(resolvedCustomer._id)) {
      session.customerId = resolvedCustomer._id;
      needsSave = true;
    }

    if (needsSave) {
      await session.save();
    }

    return session;
  }

  static isSessionExpired(session) {
    if (!session?.updatedAt) {
      return true;
    }

    return (Date.now() - new Date(session.updatedAt).getTime()) > this.SESSION_TIMEOUT;
  }

  static getExpiryInfo(session) {
    const lastUpdateTime = new Date(session?.updatedAt || 0).getTime();
    const expiresAt = new Date(lastUpdateTime + this.SESSION_TIMEOUT);
    const remainingTime = expiresAt.getTime() - Date.now();

    return {
      isExpired: remainingTime <= 0,
      remainingTime: Math.max(0, remainingTime),
      expiresAt,
      lastUpdated: session?.updatedAt ? new Date(session.updatedAt) : null,
    };
  }

  static async updateSession(session, data = {}) {
    if (data.step !== undefined || data.currentStep !== undefined) {
      session.currentStep = data.currentStep ?? data.step;
    }

    if (data.context !== undefined) {
      session.context = {
        ...(session.context || {}),
        ...(data.context || {}),
      };
      session.markModified('context');
    }

    if (data.lastMessage !== undefined) {
      session.lastMessage = data.lastMessage;
    }

    if (data.customerId !== undefined) {
      session.customerId = data.customerId;
    }

    if (data.phone !== undefined) {
      session.phone = this.normalizePhone(data.phone);
    }

    if (data.businessId !== undefined) {
      const resolvedBusinessId = this.normalizeBusinessId(data.businessId);
      session.businessId = resolvedBusinessId;
      session.tenantId = resolvedBusinessId;
    }

    await session.save();
    return session;
  }

  static async resetSession(session) {
    session.currentStep = 'start';
    session.context = {};
    session.lastMessage = '';
    session.markModified('context');
    await session.save();
    return session;
  }

  static async handleExpiryReset(session) {
    if (this.isSessionExpired(session)) {
      return this.resetSession(session);
    }
    return session;
  }

  static async setContextValue(session, key, value) {
    const keys = String(key || '').split('.');
    const nextContext = { ...(session.context || {}) };
    let current = nextContext;

    for (let index = 0; index < keys.length - 1; index += 1) {
      const part = keys[index];
      current[part] = current[part] && typeof current[part] === 'object' ? current[part] : {};
      current = current[part];
    }

    current[keys[keys.length - 1]] = value;
    session.context = nextContext;
    session.markModified('context');
    await session.save();
    return session;
  }

  static getContextValue(session, key, defaultValue = null) {
    const keys = String(key || '').split('.');
    let current = session?.context;

    for (const part of keys) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return defaultValue;
      }
    }

    return current;
  }

  static interpolateTemplate(template, session) {
    if (!template || typeof template !== 'string') {
      return template;
    }

    const context = session?.context || {};

    return template.replace(/\{\{([^}]+)\}\}/g, (match, rawKey) => {
      const key = String(rawKey || '').trim();
      const value = this.getContextValue({ context }, key, match);
      return value === undefined || value === null || value === '' ? match : String(value);
    });
  }

  static getSessionMetadata(session) {
    const expiry = this.getExpiryInfo(session);

    return {
      phone: session?.phone || '',
      businessId: session?.businessId || null,
      customerId: session?.customerId || null,
      currentStep: session?.currentStep || 'start',
      contextKeys: Object.keys(session?.context || {}),
      lastMessage: session?.lastMessage || '',
      updatedAt: session?.updatedAt || null,
      expiryInfo: {
        isExpired: expiry.isExpired,
        remainingMinutes: Math.floor(expiry.remainingTime / 60000),
        expiresAt: expiry.expiresAt,
      },
    };
  }

  static async clearContext(session, keys = []) {
    const nextContext = { ...(session.context || {}) };
    for (const key of keys) {
      delete nextContext[key];
    }
    session.context = nextContext;
    session.markModified('context');
    await session.save();
    return session;
  }

  static async getSessionSafe(phone, businessId, customer = null) {
    let session = await this.getOrCreateSession(phone, businessId, customer);
    session = await this.handleExpiryReset(session);
    return session;
  }
}

export default SessionService;
