import Campaign from '../models/Campaign.js';
import Customer from '../models/Customer.js';
import Message from '../models/Message.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import CustomerStatusService from './customerStatusService.js';
import buildTenantScope from '../utils/tenantScope.js';
import { buildCreatedAtFilter, buildSearchRegex } from '../utils/queryFilters.js';

class CampaignService {
  toValidNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  calculateOfferPrice(mrp, offerPercentage) {
    const safeMrp = this.toValidNumber(mrp, 0);
    const safeOfferPercentage = this.toValidNumber(offerPercentage, 0);
    const calculated = safeMrp - (safeMrp * (safeOfferPercentage / 100));
    return Math.max(0, Number(calculated.toFixed(2)));
  }

  async createCampaign(businessId, message, audience, type = 'TEXT', productIds = [], productOffers = []) {
    const normalizedAudience = audience === 'customers' ? 'existing' : audience;
    const tenantScope = buildTenantScope(businessId);
    const allCustomers = await Customer.find(tenantScope).select('_id status').lean();

    let customers = allCustomers;
    if (normalizedAudience === 'existing') {
      const statusMap = await CustomerStatusService.syncStatusesForCustomers(
        allCustomers.map((customer) => customer._id)
      );

      customers = allCustomers.filter((customer) => {
        const resolvedStatus = statusMap.get(String(customer._id)) || customer.status || 'new';
        return String(resolvedStatus).toLowerCase() === 'existing';
      });
    }

    const totalCustomers = customers.length;
    const sentCount = totalCustomers;

    // If PRODUCT type, fetch and embed products
    let embedProducts = [];
    if (type === 'PRODUCT' && productIds.length > 0) {
      const products = await Product.find({ _id: { $in: productIds }, isActive: true, ...tenantScope });
      const offerOverrides = new Map(
        (productOffers || [])
          .filter((entry) => entry?.productId)
          .map((entry) => [String(entry.productId), this.toValidNumber(entry.offerPercentage, 10)])
      );

      embedProducts = products.map((product) => {
        const mrp = this.toValidNumber(product.mrp, 0);
        const overrideOffer = offerOverrides.get(String(product._id));
        const baseOfferPercentage = this.toValidNumber(product.offerPercentage, 0);
        const offerPercentage = Math.min(100, Math.max(0, Number.isFinite(overrideOffer) ? overrideOffer : baseOfferPercentage));
        const offerPrice = this.calculateOfferPrice(mrp, offerPercentage);

        return {
          _id: product._id,
          name: product.name,
          mrp,
          offerPrice,
          offerPercentage,
          unitType: product.unitType,
          category: product.category,
          image: product.image,
          redirectUrl: product.redirectUrl,
        };
      });
    }

    const campaign = await Campaign.create({
      message,
      type,
      products: productIds,
      audience: normalizedAudience,
      totalCustomers,
      sentCount,
      businessId,
    });

    const messageDocs = customers.map((customer) => ({
      customerId: customer._id,
      message,
      type: 'outgoing',
      senderType: 'admin',
      products: embedProducts.length > 0 ? embedProducts : undefined,
      campaignId: campaign._id,
      businessId,
    }));

    if (messageDocs.length) {
      await Message.insertMany(messageDocs);
      await Customer.updateMany(
        { _id: { $in: customers.map((c) => c._id) } },
        { $set: { lastCampaignId: campaign._id, updatedAt: new Date() } }
      );
    }

    return campaign;
  }

  async getCampaignAnalytics(businessId, campaignId) {
    const tenantScope = buildTenantScope(businessId);
    const campaign = await Campaign.findOne({ _id: campaignId, ...tenantScope }).lean();
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const convertedCustomers = await Order.countDocuments({ campaignId, ...tenantScope, status: 'Confirmed' });
    const successRate = campaign.totalCustomers > 0
      ? Math.round((campaign.sentCount / campaign.totalCustomers) * 100)
      : 0;
    const conversionRate = campaign.totalCustomers > 0
      ? Math.round((convertedCustomers / campaign.totalCustomers) * 100)
      : 0;

    return {
      totalCustomers: campaign.totalCustomers,
      sentCount: campaign.sentCount,
      successRate,
      conversionRate,
      convertedCustomers,
    };
  }

  async getCampaigns(businessId, filters = {}) {
    const tenantScope = buildTenantScope(businessId);
    const query = { ...tenantScope };
    const createdAt = buildCreatedAtFilter(filters);
    const searchRegex = buildSearchRegex(filters.search);

    if (createdAt) query.createdAt = createdAt;
    if (searchRegex) {
      query.$or = [
        { message: searchRegex },
        { audience: searchRegex },
        { type: searchRegex },
      ];
    }

    const campaigns = await Campaign.find(query).sort({ createdAt: -1 }).lean();

    const enriched = await Promise.all(campaigns.map(async (campaign) => {
      const convertedCustomers = await Order.countDocuments({ campaignId: campaign._id, ...tenantScope, status: 'Confirmed' });
      const successRate = campaign.totalCustomers > 0
        ? Math.round((campaign.sentCount / campaign.totalCustomers) * 100)
        : 0;
      const conversionRate = campaign.totalCustomers > 0
        ? Math.round((convertedCustomers / campaign.totalCustomers) * 100)
        : 0;

      return {
        ...campaign,
        successRate,
        conversionRate,
        convertedCustomers,
      };
    }));

    return enriched;
  }
}

export default new CampaignService();
