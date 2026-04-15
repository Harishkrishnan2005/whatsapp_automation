import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Business from '../models/Business.js';
import buildTenantScope from '../utils/tenantScope.js';

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

  async login(email, password) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    let resolvedBusinessId = user.businessId;
    if (!resolvedBusinessId) {
      const fallbackBusiness = await Business.findOne().select('_id').lean();
      if (!fallbackBusiness?._id) {
        throw new Error('No business found for this account');
      }
      resolvedBusinessId = fallbackBusiness._id;
      await User.findByIdAndUpdate(user._id, { businessId: resolvedBusinessId });
    }

    const accessToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role, businessId: resolvedBusinessId },
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
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        permissions: user.permissions,
        businessId: resolvedBusinessId,
      },
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
        { id: user._id, email: user.email, role: user.role, businessId: user.businessId },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return { accessToken };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  async createStaff(staffPayload, businessId) {
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
    if (!resolvedBusinessId) {
      const fallbackBusiness = await Business.findOne().select('_id').lean();
      if (!fallbackBusiness?._id) {
        throw new Error('No business found to assign staff');
      }
      resolvedBusinessId = fallbackBusiness._id;
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
    });

    return {
      id: staff._id,
      email: staff.email,
      name: staff.name,
      role: staff.role,
      employeeId: staff.employeeId,
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
    return await User.findOneAndUpdate(
      filter,
      { permissions },
      { new: true }
    ).select('-password');
  }

  async deleteStaff(staffId, businessId) {
    const filter = { _id: staffId };
    if (businessId) {
      filter.businessId = businessId;
    }
    return await User.findOneAndDelete(filter);
  }

  async seedAdmin() {
    const businessExists = await Business.findOne({ email: 'admin@test.com' });
    let business;
    if (!businessExists) {
      business = await Business.create({
        name: 'Test Business',
        email: 'admin@test.com',
        plan: 'Pro',
      });
      console.log('Business seeded');
    } else {
      business = businessExists;
    }

    const adminExists = await User.findOne({ email: 'admin@test.com' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        email: 'admin@test.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        businessId: business._id,
        permissions: [
          'manage_customers',
          'manage_orders',
          'manage_campaigns',
          'manage_staff',
          'manage_chatbot',
          'view_analytics',
          'manage_appointments',
        ],
      });
      console.log('Admin user seeded');
    }
  }
}

export default new AuthService();
