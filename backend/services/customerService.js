import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import CustomerStatusService from './customerStatusService.js';
import buildTenantScope from '../utils/tenantScope.js';
import { buildCreatedAtFilter, buildSearchRegex } from '../utils/queryFilters.js';

class CustomerService {
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
    const statusMap = await CustomerStatusService.syncStatusesForCustomers(customers.map((customer) => customer._id));

    const customerIds = customers.map((customer) => customer._id);
    const orderRows = await Order.find(
      { ...tenantScope, customerId: { $in: customerIds } },
      { customerId: 1, paymentMethod: 1, status: 1, createdAt: 1 }
    ).sort({ createdAt: -1 }).lean();

    const orderSummaryMap = new Map();
    for (const order of orderRows) {
      const key = String(order.customerId);
      if (!orderSummaryMap.has(key)) {
        orderSummaryMap.set(key, {
          totalOrders: 0,
          onlineOrders: 0,
          codOrders: 0,
          pendingCodOrders: 0,
          latestOrder: order,
        });
      }

      const summary = orderSummaryMap.get(key);
      summary.totalOrders += 1;

      if (order.paymentMethod === 'UPI') {
        summary.onlineOrders += 1;
      } else {
        summary.codOrders += 1;
        if (order.status === 'Pending') {
          summary.pendingCodOrders += 1;
        }
      }
    }

    const enrichedCustomers = customers.map((customer) => {
      const summary = orderSummaryMap.get(String(customer._id)) || {
        totalOrders: 0,
        onlineOrders: 0,
        codOrders: 0,
        pendingCodOrders: 0,
        latestOrder: null,
      };

      let paymentStatus = 'No Orders';
      if (summary.totalOrders > 0) {
        paymentStatus = summary.pendingCodOrders > 0
          ? `Pending COD (${summary.pendingCodOrders})`
          : 'Completed';
      }

      let orderStatus = 'No Orders';
      if (summary.latestOrder) {
        orderStatus = summary.latestOrder.paymentMethod === 'UPI'
          ? 'Confirmed'
          : (summary.latestOrder.status || 'Pending');
      }

      return {
        ...customer,
        status: statusMap.get(String(customer._id)) || 'new',
        totalOrders: summary.totalOrders,
        paymentStatus,
        orderStatus,
      };
    });

    const total = await Customer.countDocuments(query);
    return { customers: enrichedCustomers, total, page, limit };
  }

  async getCustomerById(businessId, id) {
    await CustomerStatusService.syncStatusForCustomer(id);
    return await Customer.findOne({ _id: id, businessId });
  }

  async updateCustomerStatus(businessId, id) {
    await CustomerStatusService.syncStatusForCustomer(id);
    return await Customer.findOne({ _id: id, businessId });
  }
}

export default new CustomerService();
