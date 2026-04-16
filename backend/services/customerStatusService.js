import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Appointment from '../models/Appointment.js';
import buildTenantScope from '../utils/tenantScope.js';

class CustomerStatusService {
  getStatusByActivityCount(activityCount) {
    return activityCount > 1 ? 'existing' : 'new';
  }

  async getActivityCountMap(customerIds, businessId) {
    if (!customerIds?.length) {
      return new Map();
    }

    const normalizedIds = customerIds
      .map((id) => id?.toString?.())
      .filter((id) => Boolean(id) && mongoose.isValidObjectId(id));

    if (!normalizedIds.length) {
      return new Map();
    }

    const objectIds = normalizedIds.map((id) => new mongoose.Types.ObjectId(id));

    const tenantScope = buildTenantScope(businessId);
    const [orderCounts, appointmentCounts] = await Promise.all([
      Order.aggregate([
        { $match: { customerId: { $in: objectIds }, ...tenantScope } },
        { $group: { _id: '$customerId', count: { $sum: 1 } } },
      ]),
      Appointment.aggregate([
        { $match: { customerId: { $in: objectIds }, ...tenantScope } },
        { $group: { _id: '$customerId', count: { $sum: 1 } } },
      ]),
    ]);

    const map = new Map(normalizedIds.map((id) => [id, 0]));

    for (const row of orderCounts) {
      const id = row._id.toString();
      map.set(id, (map.get(id) || 0) + row.count);
    }

    for (const row of appointmentCounts) {
      const id = row._id.toString();
      map.set(id, (map.get(id) || 0) + row.count);
    }

    return map;
  }

  async syncStatusesForCustomers(customerIds, businessId) {
    if (!customerIds?.length) {
      return new Map();
    }

    const activityMap = await this.getActivityCountMap(customerIds, businessId);
    const tenantScope = buildTenantScope(businessId);
    const statusMap = new Map();
    const bulkOps = [];

    for (const customerId of customerIds) {
      const id = customerId.toString();
      if (!mongoose.isValidObjectId(id)) {
        continue;
      }
      const objectId = new mongoose.Types.ObjectId(id);
      const status = this.getStatusByActivityCount(activityMap.get(id) || 0);
      statusMap.set(id, status);

      bulkOps.push({
        updateOne: {
          filter: { _id: objectId, ...tenantScope, status: { $ne: status } },
          update: { $set: { status } },
        },
      });
    }

    if (bulkOps.length) {
      await Customer.bulkWrite(bulkOps, { ordered: false });
    }

    return statusMap;
  }

  async syncStatusForCustomer(customerId, businessId) {
    const statusMap = await this.syncStatusesForCustomers([customerId], businessId);
    return statusMap.get(customerId.toString()) || 'new';
  }
}

export default new CustomerStatusService();
