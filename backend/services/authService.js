import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Business from '../models/Business.js';
import buildTenantScope from '../utils/tenantScope.js';
import chatbotSeederService from './chatbotSeederService.js';

const ADMIN_PERMISSIONS = [
  'manage_customers',
  'manage_orders',
  'manage_campaigns',
  'manage_staff',
  'manage_chatbot',
  'view_analytics',
  'manage_appointments',
];

class AuthService {
  async generateEmployeeId(dateOfJoining) {
    const joiningDate = dateOfJoining ? new Date(dateOfJoining) : new Date();
    const year = joiningDate.getFullYear();
    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
    const yearEnd = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    const staffCountForYear = await User.countDocuments({
      role: 'staff',
      dateOfJoining: { $gte: yearStart, $lt: yearEnd },
    });

    const sequence = String(staffCountForYear + 1).padStart(4, '0');
    return `EMPID-${year}-${sequence}`;
  }

  buildUserResponse(user, businessId = user.businessId) {
    return {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      permissions: user.permissions,
      businessId: businessId?._id || businessId,
      businessName: businessId?.name || user.businessName || null,
      businessType: user.businessType,
    };
  }

  buildAccessTokenPayload(user, businessId = user.businessId) {
    return {
      id: user._id,
      email: user.email,
      role: user.role,
      businessId: businessId?._id || businessId,
      businessType: user.businessType,
    };
  }

  async registerAdmin(payload) {
    const {
      name,
      email,
      password,
      businessName,
      businessType = 'E_COMMERCE',
    } = payload;

    const category = businessType === 'BOOKING' ? 'booking' : 'ecommerce';

    const exists = await User.findOne({ email });
    if (exists) {
      throw new Error('User already exists');
    }

    const business = await Business.create({
      name: businessName || `${name}'s Business`,
      email,
      plan: 'Pro',
      businessType,
      category,
    });

    // Automatically seed chatbot flows based on category
    if (category === 'booking') {
      await chatbotSeederService.seedBookingFlows(business._id);
    } else {
      await chatbotSeederService.seedEcommerceFlows(business._id);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      permissions: ADMIN_PERMISSIONS,
      businessId: business._id,
      businessType,
    });

    return this.buildUserResponse(admin, business);
  }

  async login(email, password, role = null) {
    const query = { email };
    if (role) {
      query.role = role;
    }

    const user = await User.findOne(query).populate('businessId');
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    let resolvedBusinessId = user.businessId;
    let resolvedBusinessType = user.businessType;

    if (!resolvedBusinessId && user.role !== 'super_admin') {
      const fallbackBusiness = await Business.findOne().select('_id businessType').lean();
      if (!fallbackBusiness?._id) {
        throw new Error('No business found for this account');
      }
      resolvedBusinessId = fallbackBusiness._id;
      resolvedBusinessType = fallbackBusiness.businessType || resolvedBusinessType || 'E_COMMERCE';
      await User.findByIdAndUpdate(user._id, {
        businessId: resolvedBusinessId,
        businessType: resolvedBusinessType,
      });
      user.businessId = resolvedBusinessId;
      user.businessType = resolvedBusinessType;
    }

    const accessToken = jwt.sign(
      this.buildAccessTokenPayload(user, resolvedBusinessId),
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const refreshToken = jwt.sign(
      { id: user._id, tokenType: 'refresh' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return {
      accessToken,
      refreshToken,
      user: this.buildUserResponse(user, user.businessId),
    };
  }

  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      if (decoded.tokenType !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      const user = await User.findById(decoded.id);
      if (!user) {
        throw new Error('User not found');
      }

      const accessToken = jwt.sign(
        this.buildAccessTokenPayload(user),
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return { accessToken };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  async createStaff(staffPayload, businessId, businessType) {
    const {
      email,
      password,
      name,
      permissions = [],
      phone,
      department,
      designation,
      gender,
      dateOfBirth,
      dateOfJoining,
      address,
      isActive = true,
    } = staffPayload;

    const staffExists = await User.findOne({ email });
    if (staffExists) {
      throw new Error('User already exists');
    }

    let resolvedBusinessId = businessId;
    let resolvedBusinessType = businessType;

    if (!resolvedBusinessId) {
      const fallbackBusiness = await Business.findOne().select('_id businessType').lean();
      if (!fallbackBusiness?._id) {
        throw new Error('No business found to assign staff');
      }
      resolvedBusinessId = fallbackBusiness._id;
      resolvedBusinessType = fallbackBusiness.businessType || 'E_COMMERCE';
    }

    const employeeId = await this.generateEmployeeId(dateOfJoining);
    const hashedPassword = await bcrypt.hash(password, 10);
    const staff = await User.create({
      email,
      password: hashedPassword,
      name,
      employeeId,
      phone,
      department,
      designation,
      gender,
      dateOfBirth: dateOfBirth || null,
      dateOfJoining: dateOfJoining || null,
      address,
      role: 'staff',
      permissions,
      isActive,
      businessId: resolvedBusinessId,
      businessType: resolvedBusinessType || 'E_COMMERCE',
    });

    return {
      id: staff._id,
      email: staff.email,
      name: staff.name,
      role: staff.role,
      employeeId: staff.employeeId,
      businessType: staff.businessType,
    };
  }

  async getStaffUsers(businessId) {
    return await User.find({ role: 'staff', ...buildTenantScope(businessId) }).select('-password');
  }

  async updateStaffPermissions(staffId, permissions, businessId) {
    const filter = { _id: staffId };
    if (businessId) {
      filter.businessId = businessId;
    }
    return await User.findOneAndUpdate(filter, { permissions }, { new: true }).select('-password');
  }

  async deleteStaff(staffId, businessId) {
    const filter = { _id: staffId, role: 'staff' };
    if (businessId) {
      filter.businessId = businessId;
    }
    return await User.findOneAndDelete(filter);
  }

  async seedSuperAdmin() {
    const superAdminEmail = 'superadmin@system.com';
    const superAdminPassword = process.env.SUPERADMIN_PASSWORD || 'superadmin123';

    const existingSuperAdmin = await User.findOne({ email: superAdminEmail, role: 'super_admin' });
    if (!existingSuperAdmin) {
      const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
      await User.create({
        email: superAdminEmail,
        password: hashedPassword,
        name: 'Super Admin',
        role: 'super_admin',
        permissions: [],
      });
      console.log('Super admin user seeded');
    }
  }
}

export default new AuthService();
