import CustomerService from '../services/customerService.js';

class CustomerController {
  async getCustomers(req, res) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const filters = {
        from: req.query.from || '',
        to: req.query.to || '',
        search: req.query.search || '',
      };
      const result = await CustomerService.getCustomers(req.businessId, page, limit, filters);
      res.json(result);
    } catch (error) {
      console.error('[CustomerController] getCustomers error:', {
        businessId: req.businessId ? String(req.businessId) : null,
        page: req.query?.page,
        limit: req.query?.limit,
        search: req.query?.search,
        error: error.message,
      });
      res.status(500).json({ message: error.message });
    }
  }

  async updateCustomerStatus(req, res) {
    try {
      const { id } = req.params;
      const customer = await CustomerService.updateCustomerStatus(req.businessId, id);
      res.json(customer);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getCustomerById(req, res) {
    try {
      const { id } = req.params;
      const customer = await CustomerService.getCustomerById(req.businessId, id);
      if (!customer) return res.status(404).json({ message: 'Customer not found' });
      res.json(customer);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new CustomerController();
