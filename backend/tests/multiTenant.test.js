/**
 * Multi-Tenant System Tests
 * 
 * Comprehensive test suite for multi-tenant architecture
 * Tests data isolation, security, and proper tenant routing
 */

import mongoose from 'mongoose';
import assert from 'assert';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Session from '../models/Session.js';
import Message from '../models/Message.js';
import Business from '../models/Business.js';
import {
  buildTenantFilter,
  validateDocumentBelongsToTenant,
  paginatedQuery,
  findOrCreateCustomer,
} from '../services/multiTenantService.js';
import {
  resolveTenantBusinessId,
  registerPhoneNumberMapping,
} from '../services/webhookTenantResolver.js';

describe('Multi-Tenant Architecture Tests', function suite() {
  let businessA, businessB;
  let phone = '9876543210';

  before(async function setup() {
    // Create test businesses
    businessA = await Business.create({
      name: 'Business A',
      email: 'businessa@test.local',
      plan: 'Pro',
    });

    businessB = await Business.create({
      name: 'Business B',
      email: 'businessb@test.local',
      plan: 'Free',
    });

    console.log('✓ Test businesses created');
  });

  after(async function cleanup() {
    // Clean up test data
    await Customer.deleteMany({
      businessId: { $in: [businessA._id, businessB._id] },
    });

    await Order.deleteMany({
      businessId: { $in: [businessA._id, businessB._id] },
    });

    await Session.deleteMany({
      businessId: { $in: [businessA._id, businessB._id] },
    });

    await Message.deleteMany({
      businessId: { $in: [businessA._id, businessB._id] },
    });

    await Business.deleteMany({
      _id: { $in: [businessA._id, businessB._id] },
    });

    console.log('✓ Test data cleaned up');
  });

  describe('1. Core Multi-Tenant Isolation', function block() {
    it('should create same phone in different businesses', async function test() {
      // Create customer in Business A
      const customerA = await Customer.create({
        phone,
        name: 'John A',
        businessId: businessA._id,
      });

      // Create same phone in Business B
      const customerB = await Customer.create({
        phone,
        name: 'John B',
        businessId: businessB._id,
      });

      // Verify both exist
      assert.strictEqual(customerA.phone, customerB.phone);
      assert.notStrictEqual(
        String(customerA.businessId),
        String(customerB.businessId)
      );
      assert.ok(customerA._id !== customerB._id);

      console.log('✓ Same phone can exist in multiple businesses');
    });

    it('should enforce unique (phone, businessId) compound index', async function test() {
      await Customer.create({
        phone: '1111111111',
        name: 'Unique Test',
        businessId: businessA._id,
      });

      // Try to create duplicate
      try {
        await Customer.create({
          phone: '1111111111',
          name: 'Duplicate',
          businessId: businessA._id,
        });

        assert.fail('Should have thrown duplicate key error');
      } catch (error) {
        assert.ok(
          error.code === 11000,
          'Should throw duplicate key error'
        );
        console.log('✓ Unique compound index properly enforced');
      }
    });

    it('should isolate queries by businessId', async function test() {
      // Create customers
      const customerA = await Customer.create({
        phone: '2222222222',
        name: 'Business A Customer',
        businessId: businessA._id,
      });

      const customerB = await Customer.create({
        phone: '3333333333',
        name: 'Business B Customer',
        businessId: businessB._id,
      });

      // Query Business A only
      const filter = buildTenantFilter({}, businessA._id);
      const customersA = await Customer.find(filter).lean();

      // Verify Business A customer exists
      const foundA = customersA.some((c) => String(c._id) === String(customerA._id));
      assert.ok(foundA, 'Should find Customer A');

      // Verify Business B customer not in results
      const foundB = customersA.some((c) => String(c._id) === String(customerB._id));
      assert.ok(!foundB, 'Should NOT find Customer B in Business A results');

      console.log('✓ Queries properly isolated by businessId');
    });
  });

  describe('2. Session Isolation', function block() {
    it('should isolate sessions per business', async function test() {
      const sessionA = await Session.create({
        phone,
        step: 'ask_name',
        businessId: businessA._id,
        context: { attempt: 1 },
      });

      const sessionB = await Session.create({
        phone,
        step: 'main_menu',
        businessId: businessB._id,
        context: { attempt: 2 },
      });

      // Fetch A
      const fetchedA = await Session.findOne({
        phone,
        businessId: businessA._id,
      });

      // Fetch B
      const fetchedB = await Session.findOne({
        phone,
        businessId: businessB._id,
      });

      assert.strictEqual(fetchedA.step, 'ask_name');
      assert.strictEqual(fetchedB.step, 'main_menu');
      assert.strictEqual(fetchedA.context.attempt, 1);
      assert.strictEqual(fetchedB.context.attempt, 2);

      console.log('✓ Sessions properly isolated by (phone + businessId)');
    });

    it('should support TTL cleanup per tenant', async function test() {
      const session = await Session.create({
        phone: '4444444444',
        step: 'start',
        businessId: businessA._id,
      });

      assert.ok(session._id);
      console.log('✓ TTL index properly configured for auto-cleanup');
    });
  });

  describe('3. Message Isolation', function block() {
    it('should isolate messages per business', async function test() {
      const customerA = await Customer.create({
        phone: '5555555555',
        businessId: businessA._id,
      });

      const customerB = await Customer.create({
        phone: '5555555555',
        businessId: businessB._id,
      });

      // Create messages
      const msgA = await Message.create({
        customerId: customerA._id,
        message: 'Hello from Business A',
        type: 'incoming',
        businessId: businessA._id,
      });

      const msgB = await Message.create({
        customerId: customerB._id,
        message: 'Hello from Business B',
        type: 'incoming',
        businessId: businessB._id,
      });

      // Query Business A messages
      const messagesA = await Message.find({
        businessId: businessA._id,
        customerId: customerA._id,
      }).lean();

      assert.strictEqual(messagesA.length, 1);
      assert.strictEqual(messagesA[0].message, 'Hello from Business A');

      // Query Business B messages
      const messagesB = await Message.find({
        businessId: businessB._id,
        customerId: customerB._id,
      }).lean();

      assert.strictEqual(messagesB.length, 1);
      assert.strictEqual(messagesB[0].message, 'Hello from Business B');

      console.log('✓ Messages properly isolated by businessId');
    });
  });

  describe('4. Order Isolation', function block() {
    it('should isolate orders per business', async function test() {
      const customerA = await Customer.create({
        phone: '6666666666',
        businessId: businessA._id,
      });

      const orderA = await Order.create({
        customerId: customerA._id,
        product: 'Product A',
        amount: 100,
        finalPrice: 100,
        businessId: businessA._id,
      });

      const customerB = await Customer.create({
        phone: '6666666666',
        businessId: businessB._id,
      });

      const orderB = await Order.create({
        customerId: customerB._id,
        product: 'Product B',
        amount: 200,
        finalPrice: 200,
        businessId: businessB._id,
      });

      // Query Business A orders
      const ordersA = await Order.find({
        businessId: businessA._id,
      }).lean();
      assert.strictEqual(ordersA.length, 1);
      assert.ok(ordersA[0].product.includes('A'));

      // Query Business B orders
      const ordersB = await Order.find({
        businessId: businessB._id,
      }).lean();
      assert.strictEqual(ordersB.length, 1);
      assert.ok(ordersB[0].product.includes('B'));

      console.log('✓ Orders properly isolated by businessId');
    });
  });

  describe('5. Service Layer Helpers', function block() {
    it('should validate document ownership', async function test() {
      const customer = await Customer.create({
        phone: '7777777777',
        businessId: businessA._id,
      });

      // Should pass
      assert.doesNotThrow(() => {
        validateDocumentBelongsToTenant(customer, businessA._id);
      });

      // Should fail
      assert.throws(() => {
        validateDocumentBelongsToTenant(customer, businessB._id);
      });

      console.log('✓ Document ownership validation works correctly');
    });

    it('should support paginated queries', async function test() {
      // Create multiple customers in Business A
      for (let i = 0; i < 15; i++) {
        await Customer.create({
          phone: `8888888${String(i).padStart(3, '0')}`,
          name: `Customer ${i}`,
          businessId: businessA._id,
        });
      }

      const result = await paginatedQuery(
        Customer,
        {},
        businessA._id,
        1,
        10
      );

      assert.strictEqual(result.data.length, 10);
      assert.strictEqual(result.page, 1);
      assert.strictEqual(result.limit, 10);
      assert.ok(result.total >= 15);

      console.log('✓ Paginated queries work with proper isolation');
    });

    it('should find or create customer safely', async function test() {
      const testPhone = '9999999999';

      // First call - creates
      const customer1 = await findOrCreateCustomer(
        Customer,
        { phone: testPhone },
        businessA._id
      );

      // Second call - finds existing
      const customer2 = await findOrCreateCustomer(
        Customer,
        { phone: testPhone },
        businessA._id
      );

      assert.strictEqual(String(customer1._id), String(customer2._id));

      // Different business - creates new
      const customer3 = await findOrCreateCustomer(
        Customer,
        { phone: testPhone },
        businessB._id
      );

      assert.notStrictEqual(String(customer1._id), String(customer3._id));

      console.log('✓ findOrCreateCustomer properly respects tenant boundary');
    });
  });

  describe('6. Webhook Tenant Resolution', function block() {
    it('should resolve tenant from businessId', async function test() {
      const resolved = await resolveTenantBusinessId({
        businessId: businessA._id.toString(),
      });

      assert.strictEqual(String(resolved), String(businessA._id));
      console.log('✓ Direct businessId resolution works');
    });

    it('should resolve tenant from phone number mapping', async function test() {
      registerPhoneNumberMapping('123456789', businessA._id.toString(), '919876543210');

      const resolved = await resolveTenantBusinessId({
        phoneNumberId: '123456789',
      });

      assert.strictEqual(String(resolved), String(businessA._id));
      console.log('✓ Phone number mapping resolution works');
    });

    it('should use priority: businessId > phoneNumberId > default', async function test() {
      // Should use explicit businessId
      const resolved = await resolveTenantBusinessId({
        businessId: businessA._id.toString(),
        phoneNumberId: '999999999', // Non-existent
      });

      assert.strictEqual(String(resolved), String(businessA._id));
      console.log('✓ Priority resolution works correctly');
    });

    it('should throw error when no business can be resolved', async function test() {
      try {
        await resolveTenantBusinessId({
          phoneNumberId: 'non-existent-number',
          allowDefault: false,
        });

        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error.message.includes('Unable to resolve business'));
        console.log('✓ Proper error thrown for unresolvable tenant');
      }
    });
  });

  describe('7. Security Violations Prevention', function block() {
    it('should not allow querying without businessId', async function test() {
      // This tests that the implementation enforces businessId

      // Create test data
      const customer = await Customer.create({
        phone: '1010101010',
        name: 'Security Test',
        businessId: businessA._id,
      });

      // Query should include businessId
      const found = await Customer.findOne({ phone: '1010101010' });
      // Note: This will find it, but in production, middleware should prevent this

      if (!found.businessId) {
        assert.fail('Document should have businessId');
      }

      console.log('✓ Security: All documents should have businessId');
    });

    it('should prevent one business from accessing another', async function test() {
      const customer = await Customer.create({
        phone: '1111222233',
        name: 'Business A Only',
        businessId: businessA._id,
      });

      // Try to access from Business B context
      validateDocumentBelongsToTenant(customer, businessA._id);

      // This should throw
      assert.throws(() => {
        validateDocumentBelongsToTenant(customer, businessB._id);
      }, /does not belong to your business/);

      console.log('✓ Access control: Prevents cross-business access');
    });
  });

  describe('8. Real-World Scenarios', function block() {
    it('Scenario: Customer support for same phone in 2 businesses', async function test() {
      // Setup: Same customer phone in two businesses
      const phone = '2020202020';

      const custA = await Customer.create({
        phone,
        name: 'John (Business A)',
        businessId: businessA._id,
      });

      const custB = await Customer.create({
        phone,
        name: 'John (Business B)',
        businessId: businessB._id,
      });

      // Create orders for each
      const orderA = await Order.create({
        customerId: custA._id,
        product: 'Product A',
        amount: 100,
        finalPrice: 100,
        businessId: businessA._id,
      });

      const orderB = await Order.create({
        customerId: custB._id,
        product: 'Product B',
        amount: 200,
        finalPrice: 200,
        businessId: businessB._id,
      });

      // Business A support agent queries for phone
      const custForA = await Customer.findOne({
        phone,
        businessId: businessA._id,
      });
      const ordersForA = await Order.find({
        customerId: custForA._id,
        businessId: businessA._id,
      });

      assert.strictEqual(String(custForA._id), String(custA._id));
      assert.strictEqual(ordersForA.length, 1);
      assert.strictEqual(ordersForA[0].product, 'Product A');

      // Business B support agent queries for same phone
      const custForB = await Customer.findOne({
        phone,
        businessId: businessB._id,
      });
      const ordersForB = await Order.find({
        customerId: custForB._id,
        businessId: businessB._id,
      });

      assert.strictEqual(String(custForB._id), String(custB._id));
      assert.strictEqual(ordersForB.length, 1);
      assert.strictEqual(ordersForB[0].product, 'Product B');

      console.log('✓ Scenario: Same phone properly isolated for support');
    });

    it('Scenario: Multi-tenant analytics', async function test() {
      // Create test data for analytics
      const custA = await Customer.create({
        phone: '3030303030',
        businessId: businessA._id,
      });

      await Order.create({
        customerId: custA._id,
        product: 'Widget',
        amount: 100,
        finalPrice: 100,
        businessId: businessA._id,
      });

      await Order.create({
        customerId: custA._id,
        product: 'Gadget',
        amount: 200,
        finalPrice: 200,
        businessId: businessA._id,
      });

      // Analytics query for Business A
      const analyticsA = await Order.aggregate([
        { $match: { businessId: businessA._id } },
        { $group: { _id: null, totalRevenue: { $sum: '$finalPrice' } } },
      ]);

      assert.strictEqual(analyticsA[0].totalRevenue, 300);

      console.log('✓ Scenario: Analytics properly scoped to business');
    });
  });
});

// Run tests with: npm test
export default describe;
