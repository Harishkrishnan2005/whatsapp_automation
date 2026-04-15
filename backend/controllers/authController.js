import AuthService from '../services/authService.js';

class AuthController {
  async registerAdmin(req, res) {
    try {
      const { name, email, password, businessName, businessType } = req.body;
      const created = await AuthService.registerAdmin({
        name,
        email,
        password,
        businessName,
        businessType,
      });
      res.status(201).json(created);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async superAdminLogin(req, res) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password, 'super_admin');
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async adminLogin(req, res) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password, 'admin');
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async staffLogin(req, res) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password, 'staff');
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async refresh(req, res) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token required' });
      }

      const result = await AuthService.refreshAccessToken(refreshToken);
      return res.json(result);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  async createStaff(req, res) {
    try {
      const staff = await AuthService.createStaff(req.body, req.user.businessId, req.user.businessType);
      res.status(201).json(staff);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getStaffUsers(req, res) {
    try {
      const scopeBusinessId = req.user?.role === 'admin' ? req.user.businessId : req.user.businessId;
      const staff = await AuthService.getStaffUsers(scopeBusinessId);
      res.json(staff);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updateStaffPermissions(req, res) {
    try {
      const { id } = req.params;
      const { permissions } = req.body;
      const scopeBusinessId = req.user?.businessId;
      const staff = await AuthService.updateStaffPermissions(id, permissions, scopeBusinessId);
      res.json(staff);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async deleteStaff(req, res) {
    try {
      const { id } = req.params;
      const scopeBusinessId = req.user?.businessId;
      await AuthService.deleteStaff(id, scopeBusinessId);
      res.json({ message: 'Staff deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new AuthController();
