/**
 * Production Session Management System - Test Cases
 * 
 * This file contains comprehensive test cases for:
 * - SessionService functions
 * - ChatbotEngine with global commands
 * - Session expiry handling
 * - Context management
 * - Multi-tenant isolation
 * 
 * Run with: npm test -- tests/sessionSystem.test.js
 */

import SessionService from '../services/sessionService.js';
import ChatbotEngine from '../services/chatbotEngine.js';
import Session from '../models/Session.js';
import ChatbotFlow from '../models/ChatbotFlow.js';
import Customer from '../models/Customer.js';
import Business from '../models/Business.js';

// ========================================
// TEST SETUP & TEARDOWN
// ========================================

describe('Production Session Management System', () => {
  let testBusiness;
  let testPhone = '9876543210';

  beforeAll(async () => {
    // Create test business
    testBusiness = await Business.create({
      name: 'Test Business',
      email: 'test@business.com',
      plan: 'Pro',
    });

    // Create sample chatbot flows
    await ChatbotFlow.create([
      {
        businessId: testBusiness._id,
        trigger: '1',
        step: 'start',
        reply: 'You selected option 1',
        nextStep: 'menu',
        action: 'NONE',
        isActive: true,
      },
      {
        businessId: testBusiness._id,
        trigger: 'show products',
        step: 'start',
        reply: 'Here are our products:',
        nextStep: 'menu',
        action: 'SHOW_PRODUCTS',
        isActive: true,
      },
      {
        businessId: testBusiness._id,
        trigger: 'yes',
        step: 'confirm_order',
        reply: 'Order confirmed! 🎉',
        nextStep: 'menu',
        action: 'CREATE_ORDER',
        isActive: true,
      },
    ]);
  });

  afterAll(async () => {
    // Cleanup
    await Business.deleteOne({ _id: testBusiness._id });
    await Session.deleteMany({ businessId: testBusiness._id });
    await ChatbotFlow.deleteMany({ businessId: testBusiness._id });
    await Customer.deleteMany({ businessId: testBusiness._id });
  });

  // ========================================
  // SessionService Tests
  // ========================================

  describe('SessionService', () => {
    describe('getOrCreateSession', () => {
      it('should create a new session if not exists', async () => {
        const phone = '1111111111';
        const session = await SessionService.getOrCreateSession(phone, testBusiness._id);

        expect(session).toBeDefined();
        expect(session.phone).toBe(phone);
        expect(session.businessId).toEqual(testBusiness._id);
        expect(session.step).toBe('start');
        expect(session.context).toEqual({});
      });

      it('should return existing session', async () => {
        const phone = '2222222222';
        const session1 = await SessionService.getOrCreateSession(phone, testBusiness._id);
        const session2 = await SessionService.getOrCreateSession(phone, testBusiness._id);

        expect(session1._id).toEqual(session2._id);
        expect(session1.phone).toBe(session2.phone);
      });

      it('should isolate sessions by businessId', async () => {
        const phone = '3333333333';
        const business2 = await Business.create({
          name: 'Test Business 2',
          email: 'test2@business.com',
        });

        const session1 = await SessionService.getOrCreateSession(phone, testBusiness._id);
        const session2 = await SessionService.getOrCreateSession(phone, business2._id);

        expect(session1._id).not.toEqual(session2._id);
        expect(session1.businessId).toEqual(testBusiness._id);
        expect(session2.businessId).toEqual(business2._id);

        await Business.deleteOne({ _id: business2._id });
      });
    });

    describe('updateSession', () => {
      it('should update session step', async () => {
        const session = await SessionService.getOrCreateSession('4444444444', testBusiness._id);
        await SessionService.updateSession(session, { step: 'menu' });

        const updated = await Session.findById(session._id);
        expect(updated.step).toBe('menu');
      });

      it('should merge context', async () => {
        const session = await SessionService.getOrCreateSession('5555555555', testBusiness._id);

        await SessionService.updateSession(session, {
          context: { name: 'John' },
        });

        let updated = await Session.findById(session._id);
        expect(updated.context.name).toBe('John');

        // Merge with new context
        await SessionService.updateSession(updated, {
          context: { product: 'Rice' },
        });

        updated = await Session.findById(session._id);
        expect(updated.context.name).toBe('John');
        expect(updated.context.product).toBe('Rice');
      });

      it('should update lastMessage', async () => {
        const session = await SessionService.getOrCreateSession('6666666666', testBusiness._id);
        const message = 'Hello bot!';

        await SessionService.updateSession(session, { lastMessage: message });

        const updated = await Session.findById(session._id);
        expect(updated.lastMessage).toBe(message);
      });
    });

    describe('resetSession', () => {
      it('should reset to initial state', async () => {
        const session = await SessionService.getOrCreateSession('7777777777', testBusiness._id);

        await SessionService.updateSession(session, {
          step: 'menu',
          context: { name: 'John', product: 'Rice' },
          lastMessage: 'Show products',
        });

        await SessionService.resetSession(session);

        const reset = await Session.findById(session._id);
        expect(reset.step).toBe('start');
        expect(reset.context).toEqual({});
        expect(reset.lastMessage).toBe('');
      });
    });

    describe('isSessionExpired', () => {
      it('should return false for fresh session', async () => {
        const session = await SessionService.getOrCreateSession('8888888888', testBusiness._id);
        expect(SessionService.isSessionExpired(session)).toBe(false);
      });

      it('should return true for expired session', async () => {
        const session = await SessionService.getOrCreateSession('9999999999', testBusiness._id);

        // Manually set updatedAt to 11 minutes ago
        session.updatedAt = new Date(Date.now() - 11 * 60 * 1000);
        await session.save();

        expect(SessionService.isSessionExpired(session)).toBe(true);
      });
    });

    describe('getExpiryInfo', () => {
      it('should return correct expiry info', async () => {
        const session = await SessionService.getOrCreateSession('1010101010', testBusiness._id);
        const expiry = SessionService.getExpiryInfo(session);

        expect(expiry).toHaveProperty('isExpired');
        expect(expiry).toHaveProperty('remainingTime');
        expect(expiry).toHaveProperty('expiresAt');
        expect(expiry.isExpired).toBe(false);
        expect(expiry.remainingTime).toBeGreaterThan(0);
      });
    });

    describe('Context Management', () => {
      describe('setContextValue', () => {
        it('should set simple context value', async () => {
          const session = await SessionService.getOrCreateSession('1111111111', testBusiness._id);
          await SessionService.setContextValue(session, 'name', 'John');

          const updated = await Session.findById(session._id);
          expect(updated.context.name).toBe('John');
        });

        it('should set nested context value', async () => {
          const session = await SessionService.getOrCreateSession('1212121212', testBusiness._id);
          await SessionService.setContextValue(session, 'order.productId', '123abc');

          const updated = await Session.findById(session._id);
          expect(updated.context.order.productId).toBe('123abc');
        });
      });

      describe('getContextValue', () => {
        it('should get context value with default', async () => {
          const session = await SessionService.getOrCreateSession('1313131313', testBusiness._id);
          await SessionService.updateSession(session, { context: { name: 'Alice' } });

          const name = SessionService.getContextValue(session, 'name');
          const missing = SessionService.getContextValue(session, 'missing', 'DEFAULT');

          expect(name).toBe('Alice');
          expect(missing).toBe('DEFAULT');
        });

        it('should get nested context value', async () => {
          const session = await SessionService.getOrCreateSession('1414141414', testBusiness._id);
          await SessionService.setContextValue(session, 'order.product.price', 500);

          const reloaded = await Session.findById(session._id);
          const price = SessionService.getContextValue(reloaded, 'order.product.price');

          expect(price).toBe(500);
        });
      });

      describe('interpolateTemplate', () => {
        it('should interpolate single variable', async () => {
          const session = await SessionService.getOrCreateSession('1515151515', testBusiness._id);
          await SessionService.updateSession(session, { context: { name: 'John' } });

          const template = 'Hello {{name}}!';
          const result = SessionService.interpolateTemplate(template, session);

          expect(result).toBe('Hello John!');
        });

        it('should interpolate multiple variables', async () => {
          const session = await SessionService.getOrCreateSession('1616161616', testBusiness._id);
          await SessionService.updateSession(session, {
            context: { name: 'John', product: 'Rice', price: 500 },
          });

          const template = 'Hi {{name}}, your {{product}} costs {{price}}';
          const result = SessionService.interpolateTemplate(template, session);

          expect(result).toBe('Hi John, your Rice costs 500');
        });

        it('should handle missing variables', async () => {
          const session = await SessionService.getOrCreateSession('1717171717', testBusiness._id);
          await SessionService.updateSession(session, { context: { name: 'John' } });

          const template = 'Hi {{name}}, product: {{product}}';
          const result = SessionService.interpolateTemplate(template, session);

          expect(result).toBe('Hi John, product: {{product}}');
        });
      });

      describe('clearContext', () => {
        it('should clear specified context keys', async () => {
          const session = await SessionService.getOrCreateSession('1818181818', testBusiness._id);
          await SessionService.updateSession(session, {
            context: { name: 'John', product: 'Rice', price: 500 },
          });

          await SessionService.clearContext(session, ['product', 'price']);

          const updated = await Session.findById(session._id);
          expect(updated.context.name).toBe('John');
          expect(updated.context.product).toBeUndefined();
          expect(updated.context.price).toBeUndefined();
        });
      });
    });

    describe('getSessionMetadata', () => {
      it('should return session metadata', async () => {
        const session = await SessionService.getOrCreateSession('1919191919', testBusiness._id);
        await SessionService.updateSession(session, {
          context: { name: 'John' },
          lastMessage: 'Hello',
        });

        const metadata = SessionService.getSessionMetadata(session);

        expect(metadata).toHaveProperty('phone');
        expect(metadata).toHaveProperty('businessId');
        expect(metadata).toHaveProperty('currentStep');
        expect(metadata).toHaveProperty('contextKeys');
        expect(metadata).toHaveProperty('lastMessage');
        expect(metadata).toHaveProperty('expiryInfo');
        expect(metadata.contextKeys).toContain('name');
      });
    });
  });

  // ========================================
  // ChatbotEngine Tests
  // ========================================

  describe('ChatbotEngine', () => {
    describe('Global Commands', () => {
      it('should handle "hi" command', async () => {
        const result = await ChatbotEngine.chatbotEngine({
          phone: '2020202020',
          message: 'hi',
          businessId: testBusiness._id,
        });

        expect(result.text).toContain('Welcome');
        expect(result.type).toBe('text');
      });

      it('should handle "restart" command', async () => {
        const result = await ChatbotEngine.chatbotEngine({
          phone: '2121212121',
          message: 'restart',
          businessId: testBusiness._id,
        });

        expect(result.text).toContain('restarted');
        expect(result.type).toBe('text');
      });

      it('should handle "menu" command', async () => {
        const result = await ChatbotEngine.chatbotEngine({
          phone: '2222212222',
          message: 'menu',
          businessId: testBusiness._id,
        });

        expect(result.text).toContain('Menu');
        expect(result.type).toBe('text');
      });

      it('should reset session on global command', async () => {
        // First, advance session to menu step
        const phone = '2323232323';
        await ChatbotEngine.chatbotEngine({
          phone,
          message: '1',
          businessId: testBusiness._id,
        });

        let session = await SessionService.getOrCreateSession(phone, testBusiness._id);
        expect(session.step).toBe('menu');

        // Now use global command
        await ChatbotEngine.chatbotEngine({
          phone,
          message: 'restart',
          businessId: testBusiness._id,
        });

        session = await SessionService.getOrCreateSession(phone, testBusiness._id);
        expect(session.step).toBe('start');
      });
    });

    describe('Invalid Input', () => {
      it('should return error for missing phone', async () => {
        const result = await ChatbotEngine.chatbotEngine({
          phone: '',
          message: 'Hello',
          businessId: testBusiness._id,
        });

        expect(result.text).toContain('Invalid');
      });

      it('should return error for missing message', async () => {
        const result = await ChatbotEngine.chatbotEngine({
          phone: '2424242424',
          message: '',
          businessId: testBusiness._id,
        });

        expect(result.text).toContain('Invalid');
      });

      it('should return error for missing businessId', async () => {
        const result = await ChatbotEngine.chatbotEngine({
          phone: '2525252525',
          message: 'Hello',
          businessId: null,
        });

        expect(result.text).toContain('Invalid');
      });
    });

    describe('Global Command Precedence', () => {
      it('should execute global command even from different step', async () => {
        const phone = '2626262626';

        // Move to menu step
        await ChatbotEngine.chatbotEngine({
          phone,
          message: '1',
          businessId: testBusiness._id,
        });

        let session = await SessionService.getOrCreateSession(phone, testBusiness._id);
        expect(session.step).toBe('menu');

        // Send "hi" from menu step (should reset)
        await ChatbotEngine.chatbotEngine({
          phone,
          message: 'hi',
          businessId: testBusiness._id,
        });

        session = await SessionService.getOrCreateSession(phone, testBusiness._id);
        expect(session.step).toBe('start');
      });
    });

    describe('Session Expiry', () => {
      it('should auto-reset expired session', async () => {
        const phone = '2727272727';

        // Create and advance session
        await ChatbotEngine.chatbotEngine({
          phone,
          message: '1',
          businessId: testBusiness._id,
        });

        let session = await SessionService.getOrCreateSession(phone, testBusiness._id);
        expect(session.step).toBe('menu');

        // Manually expire session
        session.updatedAt = new Date(Date.now() - 11 * 60 * 1000);
        await session.save();

        // Send message - should trigger reset
        await ChatbotEngine.chatbotEngine({
          phone,
          message: 'test',
          businessId: testBusiness._id,
        });

        session = await SessionService.getOrCreateSession(phone, testBusiness._id);
        expect(session.step).toBe('start');
      });
    });

    describe('Multi-Tenant Isolation', () => {
      it('should isolate sessions between businesses', async () => {
        const phone = '2828282828';
        const business2 = await Business.create({
          name: 'Test Business 2',
          email: 'test2@business.com',
        });

        // Create session in business 1
        const result1 = await ChatbotEngine.chatbotEngine({
          phone,
          message: '1',
          businessId: testBusiness._id,
        });

        const session1 = await SessionService.getOrCreateSession(phone, testBusiness._id);

        // Create session in business 2
        const result2 = await ChatbotEngine.chatbotEngine({
          phone,
          message: 'menu',
          businessId: business2._id,
        });

        const session2 = await SessionService.getOrCreateSession(phone, business2._id);

        expect(session1._id).not.toEqual(session2._id);
        expect(session1.businessId).toEqual(testBusiness._id);
        expect(session2.businessId).toEqual(business2._id);

        await Business.deleteOne({ _id: business2._id });
      });
    });
  });

  // ========================================
  // Integration Tests
  // ========================================

  describe('Integration', () => {
    it('should handle complete conversation flow', async () => {
      const phone = '2929292929';

      // Step 1: Start
      let result = await ChatbotEngine.chatbotEngine({
        phone,
        message: 'hi',
        businessId: testBusiness._id,
      });
      expect(result.text).toContain('Welcome');

      // Step 2: Select option
      result = await ChatbotEngine.chatbotEngine({
        phone,
        message: '1',
        businessId: testBusiness._id,
      });
      expect(result.text).toContain('option 1');

      // Verify session state
      let session = await SessionService.getOrCreateSession(phone, testBusiness._id);
      expect(session.step).toBe('menu');

      // Step 3: Reset
      result = await ChatbotEngine.chatbotEngine({
        phone,
        message: 'restart',
        businessId: testBusiness._id,
      });

      session = await SessionService.getOrCreateSession(phone, testBusiness._id);
      expect(session.step).toBe('start');
    });
  });
});

// ========================================
// USAGE EXAMPLES
// ========================================

/**
 * Example 1: Basic session flow
 * 
 * const session = await SessionService.getOrCreateSession(
 *   '9876543210',
 *   businessId
 * );
 * 
 * await SessionService.updateSession(session, {
 *   step: 'menu',
 *   context: { name: 'John', product: 'Rice' }
 * });
 * 
 * const metadata = SessionService.getSessionMetadata(session);
 * console.log(metadata);
 */

/**
 * Example 2: Context interpolation
 * 
 * const template = 'Hi {{name}}, your {{product}} costs {{price}}';
 * const message = SessionService.interpolateTemplate(template, session);
 * // Output: "Hi John, your Rice costs 500"
 */

/**
 * Example 3: Session expiry handling
 * 
 * if (SessionService.isSessionExpired(session)) {
 *   session = await SessionService.resetSession(session);
 * }
 */

/**
 * Example 4: Chatbot conversation
 * 
 * const result = await ChatbotEngine.chatbotEngine({
 *   phone: '9876543210',
 *   message: 'show products',
 *   businessId: businessId
 * });
 * 
 * console.log(result);
 * // {
 * //   response: 'Here are our products:',
 * //   text: 'Here are our products:',
 * //   products: [...],
 * //   type: 'product'
 * // }
 */

export default {};
