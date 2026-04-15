import CustomerService from '../services/customerService.js';

class CustomerController {
  async getCustomers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const scopeBusinessId = req.user?.role === 'admin' ? undefined : req.user.businessId;
      const result = await CustomerService.getCustomers(scopeBusinessId, page, limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updateCustomerStatus(req, res) {
    try {
      const { id } = req.params;
      const customer = await CustomerService.updateCustomerStatus(req.user.businessId, id);
      res.json(customer);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new CustomerController();
