import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Appointment from '../models/Appointment.js';
import ChatSession from '../models/ChatSession.js';
import CustomerStatusService from './customerStatusService.js';
import buildTenantScope from '../utils/tenantScope.js';
import { buildCreatedAtFilter, buildSearchRegex } from '../utils/queryFilters.js';

class CustomerService {
  normalizePhone(phone) {
    return String(phone || '').trim();
  }

  resolveBusinessId(businessId) {
    return businessId?._id || businessId;
  }

  buildStrictCustomerLookup(phone, businessId) {
    return {
      phone: this.normalizePhone(phone),
      tenantId: this.resolveBusinessId(businessId),
    };
  }

  async getOrCreateCustomerByPhone(phone, businessId, seedData = {}) {
    const normalizedPhone = this.normalizePhone(phone);
    const resolvedBusinessId = this.resolveBusinessId(businessId);

    if (!normalizedPhone || !resolvedBusinessId) {
      throw new Error('phone and businessId are required');
    }

    let customer = await Customer.findOne(this.buildStrictCustomerLookup(normalizedPhone, resolvedBusinessId));

    if (!customer) {
      customer = await Customer.create({
        phone: normalizedPhone,
        businessId: resolvedBusinessId,
        tenantId: resolvedBusinessId,
        lastInteraction: new Date(),
        lastActivity: new Date(),
        ...seedData,
      });
      return customer;
    }

    let modified = false;

    if (!customer.businessId) {
      customer.businessId = resolvedBusinessId;
      modified = true;
    }

    if (!customer.tenantId) {
      customer.tenantId = resolvedBusinessId;
      modified = true;
    }

    if (seedData.name && !customer.name) {
      customer.name = seedData.name;
      modified = true;
    }

    if (modified) {
      await customer.save();
    }

    return customer;
  }

  async touchCustomer(customer, extraUpdates = {}) {
    if (!customer) {
      throw new Error('customer is required');
    }

    Object.assign(customer, extraUpdates);
    customer.lastInteraction = new Date();
    customer.lastActivity = new Date();
    await customer.save();
    return customer;
  }

  async saveCustomerField(customer, field, value) {
    if (!customer) {
      throw new Error('customer is required');
    }

    customer[field] = value;
    customer.lastInteraction = new Date();
    customer.lastActivity = new Date();
    await customer.save();
    return customer;
  }

  buildEnrichedCustomers(customers, statusMap, orderRows, appointmentRows, sessionRows) {
    const orderSummaryMap = new Map();
    const appointmentSummaryMap = new Map();
    const sessionSummaryMap = new Map();

    for (const order of orderRows) {
      const key = String(order.customerId);
      if (!orderSummaryMap.has(key)) {
        orderSummaryMap.set(key, { totalOrders: 0, pendingCodOrders: 0, latestOrder: order });
      }
      const summary = orderSummaryMap.get(key);
      summary.totalOrders += 1;
      if (order.paymentMethod !== 'UPI' && order.status === 'Pending') {
        summary.pendingCodOrders += 1;
      }
    }

    for (const appt of appointmentRows) {
      const key = String(appt.customerId);
      if (!appointmentSummaryMap.has(key)) {
        appointmentSummaryMap.set(key, { totalBookings: 0, latestBooking: appt });
      }
      const summary = appointmentSummaryMap.get(key);
      summary.totalBookings += 1;
    }

    for (const session of sessionRows) {
      const key = String(session.customerId);
      if (!sessionSummaryMap.has(key)) {
        sessionSummaryMap.set(key, session);
      }
    }

    return customers.map((customer) => {
      const oSummary = orderSummaryMap.get(String(customer._id)) || { totalOrders: 0, latestOrder: null };
      const aSummary = appointmentSummaryMap.get(String(customer._id)) || { totalBookings: 0, latestBooking: null };
      const session = sessionSummaryMap.get(String(customer._id));

      let status = statusMap.get(String(customer._id)) || 'new';
      if (aSummary.totalBookings > 0 || oSummary.totalOrders > 0) status = 'converted';
      else if (session) status = 'active';

      return {
        ...customer,
        status,
        totalOrders: oSummary.totalOrders,
        totalBookings: aSummary.totalBookings,
        totalSpent: Number(customer.totalSpent || 0),
        lastBookingDate: aSummary.latestBooking?.createdAt || aSummary.latestBooking?.date,
        lastInteraction: session?.lastInteractionAt || customer.lastActivity || customer.lastInteraction || customer.createdAt,
        dropStage: session?.isCompleted ? 'Completed' : (session?.currentStep || customer.currentStep || 'start'),
        orderStatus: oSummary.latestOrder?.status || 'No Orders',
        appointmentStatus: aSummary.latestBooking?.status || 'No Bookings'
      };
    });
  }

  async getCustomers(businessId, page = 1, limit = 10, filters = {}) {
    const skip = (page - 1) * limit;
    const tenantScope = buildTenantScope(businessId);
    const query = { ...tenantScope };
    const createdAt = buildCreatedAtFilter(filters);
    const searchRegex = buildSearchRegex(filters.search);

    if (createdAt) {
      query.createdAt = createdAt;
    }

    if (searchRegex) {
      query.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { address: searchRegex },
        { upiId: searchRegex },
      ];
    }

    const customers = await Customer.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean();
    const statusMap = await CustomerStatusService.syncStatusesForCustomers(
      customers.map((customer) => customer._id),
      businessId
    );

    const customerIds = customers.map((customer) => customer._id);
    const [orderRows, appointmentRows, sessionRows] = await Promise.all([
      Order.find({ ...tenantScope, customerId: { $in: customerIds } }).sort({ createdAt: -1 }).lean(),
      Appointment.find({ ...tenantScope, customerId: { $in: customerIds } }).sort({ createdAt: -1 }).lean(),
      ChatSession.find({ ...tenantScope, customerId: { $in: customerIds } }).sort({ lastInteractionAt: -1 }).lean()
    ]);

    const enrichedCustomers = this.buildEnrichedCustomers(
      customers,
      statusMap,
      orderRows,
      appointmentRows,
      sessionRows
    );

    const total = await Customer.countDocuments(query);
    return { customers: enrichedCustomers, total, page, limit };
  }

  async getCustomerById(businessId, id) {
    await CustomerStatusService.syncStatusForCustomer(id, businessId);
    const tenantScope = buildTenantScope(businessId);
    const customer = await Customer.findOne({ _id: id, ...tenantScope }).lean();
    if (!customer) return null;

    const [orderRows, appointmentRows, sessionRows] = await Promise.all([
      Order.find({ ...tenantScope, customerId: customer._id }).sort({ createdAt: -1 }).lean(),
      Appointment.find({ ...tenantScope, customerId: customer._id }).sort({ createdAt: -1 }).lean(),
      ChatSession.find({ ...tenantScope, customerId: customer._id }).sort({ lastInteractionAt: -1 }).lean()
    ]);

    const statusMap = new Map([[String(customer._id), customer.status || 'new']]);
    return this.buildEnrichedCustomers([customer], statusMap, orderRows, appointmentRows, sessionRows)[0];
  }

  async updateCustomerStatus(businessId, id) {
    await CustomerStatusService.syncStatusForCustomer(id, businessId);
    return await Customer.findOne({ _id: id, ...buildTenantScope(businessId) });
  }
}

export default new CustomerService();
