import ProductService from '../services/productService.js';

class ProductController {
  async createProduct(req, res) {
    try {
      const product = await ProductService.createProduct({ ...req.body, businessId: req.user.businessId });
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getProducts(req, res) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 12;
      const scopeBusinessId = req.user?.role === 'admin' ? undefined : req.user.businessId;
      const filters = {
        from: req.query.from || '',
        to: req.query.to || '',
        search: req.query.search || '',
      };
      const result = await ProductService.getProducts(scopeBusinessId, page, limit, filters);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const product = await ProductService.updateProduct(req.user.businessId, id, req.body);
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      const product = await ProductService.deleteProduct(req.user.businessId, id);
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new ProductController();
