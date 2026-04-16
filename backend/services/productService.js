import Product from '../models/Product.js';
import buildTenantScope from '../utils/tenantScope.js';
import { buildCreatedAtFilter, buildSearchRegex } from '../utils/queryFilters.js';

class ProductService {
  async createProduct(data) {
    return await Product.create(data);
  }

  async getProducts(businessId, page = 1, limit = 12, filters = {}) {
    const skip = (page - 1) * limit;
    const tenantScope = buildTenantScope(businessId);
    const query = { isActive: true, ...tenantScope };
    const createdAt = buildCreatedAtFilter(filters);
    const searchRegex = buildSearchRegex(filters.search);

    if (createdAt) query.createdAt = createdAt;
    if (searchRegex) {
      query.$or = [
        { name: searchRegex },
        { category: searchRegex },
        { unitType: searchRegex },
      ];
    }

    const products = await Product.find(query).skip(skip).limit(limit).sort({ createdAt: -1 });
    const total = await Product.countDocuments(query);
    return { products, total, page, limit };
  }

  async getActiveProducts(businessId) {
    return await Product.find({ isActive: true, ...buildTenantScope(businessId) }).sort({ name: 1 });
  }

  async getProductById(businessId, id) {
    return await Product.findOne({ _id: id, businessId });
  }

  async getProductByName(businessId, name) {
    return await Product.findOne({
      name: new RegExp(`^${name.trim().replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'i'),
      isActive: true,
      businessId,
    });
  }

  async updateProduct(businessId, id, data) {
    return await Product.findOneAndUpdate({ _id: id, businessId }, data, { new: true });
  }

  async deleteProduct(businessId, id, data) {
    return await Product.findOneAndDelete({ _id: id, businessId });
  }
}

export default new ProductService();
