import ProductService from '../services/productService.js';

class ProductController {
  async createProduct(req, res) {
    try {
      const productData = { ...req.body };
      if (req.file) {
        productData.image = req.file.path;
      }
      
      // Parse numbers as they come as strings from FormData
      if (productData.price) productData.price = parseFloat(productData.price);
      if (productData.stock) productData.stock = parseInt(productData.stock, 10);
      
      // Parse specifications if sent as JSON string
      if (typeof productData.specifications === 'string') {
        try {
          productData.specifications = JSON.parse(productData.specifications);
        } catch (e) {
          productData.specifications = [];
        }
      }

      const product = await ProductService.createProduct({ ...productData, businessId: req.businessId });
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getProducts(req, res) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 12;
      const filters = {
        from: req.query.from || '',
        to: req.query.to || '',
        search: req.query.search || '',
      };
      const result = await ProductService.getProducts(req.businessId, page, limit, filters);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const productData = { ...req.body };
      if (req.file) {
        productData.image = req.file.path;
      }

      if (productData.price) productData.price = parseFloat(productData.price);
      if (productData.stock) productData.stock = parseInt(productData.stock, 10);

      // Parse specifications if sent as JSON string
      if (typeof productData.specifications === 'string') {
        try {
          productData.specifications = JSON.parse(productData.specifications);
        } catch (e) {
          productData.specifications = [];
        }
      }

      const product = await ProductService.updateProduct(req.businessId, id, productData);
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      const product = await ProductService.deleteProduct(req.businessId, id);
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new ProductController();
