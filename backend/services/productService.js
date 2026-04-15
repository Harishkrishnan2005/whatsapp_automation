import Product from '../models/Product.js';
import buildTenantScope from '../utils/tenantScope.js';

class ProductService {
  async createProduct(data) {
    return await Product.create(data);
  }

  async getProducts(businessId, page = 1, limit = 12) {
    const skip = (page - 1) * limit;
    const tenantScope = buildTenantScope(businessId);
    const products = await Product.find({ isActive: true, ...tenantScope }).skip(skip).limit(limit).sort({ createdAt: -1 });
    const total = await Product.countDocuments({ isActive: true, ...tenantScope });
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
