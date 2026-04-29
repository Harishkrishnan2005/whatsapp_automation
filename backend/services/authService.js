import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Business from '../models/Business.js';
import Subscription from '../models/Subscription.js';
import buildTenantScope from '../utils/tenantScope.js';
import chatbotSeederService from './chatbotSeederService.js';
import seedTemplates from '../scripts/seedTemplates.js';
import { getRequiredPlanForStaffRole, isStaffRoleAllowedInPlan, resolveBusinessPlan } from '../config/plans.js';
import { normalizeStaffRole } from '../utils/staffAccess.js';

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
  normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

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
    const plan = resolveBusinessPlan(businessId);
    const tenantId = businessId?._id || businessId || user.tenantId;
    return {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      permissions: user.permissions,
      staffRole: user.staffRole || null,
      status: user.status || (user.isActive === false ? 'INACTIVE' : 'ACTIVE'),
      isActive: user.isActive !== false,
      businessId: tenantId,
      tenantId: tenantId,
      businessName: businessId?.name || user.businessName || null,
      businessType: user.businessType,
      plan,
      subscriptionStatus: businessId?.subscription?.status || 'ACTIVE',
      expiryDate: businessId?.subscription?.expiryDate || null,
    };
  }

  buildAccessTokenPayload(user, businessId = user.businessId) {
    const plan = resolveBusinessPlan(businessId);
    const tenantId = businessId?._id || businessId || user.tenantId;
    return {
      id: user._id,
      email: user.email,
      role: user.role,
      businessId: tenantId,
      tenantId: tenantId,
      businessType: user.businessType,
      staffRole: user.staffRole || null,
      status: user.status || (user.isActive === false ? 'INACTIVE' : 'ACTIVE'),
      plan,
      subscriptionStatus: businessId?.subscription?.status || 'ACTIVE',
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

    const normalizedEmail = this.normalizeEmail(email);
    const category = businessType === 'BOOKING' ? 'booking' : 'ecommerce';

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      throw new Error('User already exists');
    }

    let business = await Business.findOne({ email: normalizedEmail });
    if (!business) {
      business = await Business.create({
        name: businessName || `${name}'s Business`,
        email: normalizedEmail,
        plan: 'FREE',
        'subscription.plan': 'FREE',
        businessType,
        category,
      });
    }

    // Create initial FREE subscription record for analytics
    const existingFreeSubscription = await Subscription.findOne({
      businessId: business._id,
      plan: 'FREE',
    });
    if (!existingFreeSubscription) {
      await Subscription.create({
        businessId: business._id,
        plan: 'FREE',
        amount: 0,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 10 * 24 * 60 * 60 * 1000),
        paymentId: `FREE_INIT_${Date.now()}`,
      });
    }

    // Automatically seed chatbot flows based on category
    if (category) {
      await chatbotSeederService.seedForCategory(business._id, category);
    }

    await seedTemplates(business._id);

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: 'admin',
      permissions: ADMIN_PERMISSIONS,
      businessId: business._id,
      tenantId: business._id,
      businessType,
    });

    return this.buildUserResponse(admin, business);
  }

  async login(email, password, role = null) {
    const normalizedEmail = this.normalizeEmail(email);
    console.log('LOGIN EMAIL:', normalizedEmail);
    const query = { email: normalizedEmail };
    if (role) {
      query.role = role;
    }

    let user;
    if (role === 'staff') {
      const matchingStaffUsers = await User.find(query).populate('businessId');
      if (matchingStaffUsers.length > 1) {
        throw new Error('This staff email is linked to multiple businesses. Ask an admin to merge or rename the duplicate staff accounts.');
      }
      [user] = matchingStaffUsers;
    } else {
      user = await User.findOne(query).populate('businessId');
    }

    if (!user) {
      throw new Error('Invalid credentials');
    }
    console.log('DB EMAIL:', user.email);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    if (user.role === 'staff' && (user.status === 'INACTIVE' || user.isActive === false)) {
      throw new Error('Staff account is inactive');
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
        tenantId: resolvedBusinessId,
        businessType: resolvedBusinessType,
      });
      user.businessId = resolvedBusinessId;
      user.tenantId = resolvedBusinessId;
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
      staffRole = 'SUPPORT',
      permissions = [],
      phone,
      department,
      designation,
      gender,
      dateOfBirth,
      dateOfJoining,
      address,
      isActive = true,
      status,
    } = staffPayload;

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

    const normalizedEmail = this.normalizeEmail(email);
    const staffExists = await User.findOne({
      email: normalizedEmail,
      role: 'staff',
    });
    if (staffExists) {
      throw new Error('A staff member with this email already exists');
    }

    const normalizedStaffRole = normalizeStaffRole(staffRole);
    if (!normalizedStaffRole) {
      throw new Error('Invalid staff role');
    }

    const business = await Business.findById(resolvedBusinessId).select('plan subscription.plan').lean();
    const currentPlan = resolveBusinessPlan(business);
    if (!isStaffRoleAllowedInPlan(currentPlan, normalizedStaffRole)) {
      throw new Error(`${normalizedStaffRole} role is not allowed in ${currentPlan} plan`);
    }

    const normalizedStatus = String(status || (isActive ? 'ACTIVE' : 'INACTIVE')).toUpperCase();
    if (!['ACTIVE', 'INACTIVE'].includes(normalizedStatus)) {
      throw new Error('Invalid staff status');
    }

    const employeeId = await this.generateEmployeeId(dateOfJoining);
    const hashedPassword = await bcrypt.hash(password, 10);
    const staff = await User.create({
      email: normalizedEmail,
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
      staffRole: normalizedStaffRole,
      permissions,
      isActive: normalizedStatus === 'ACTIVE',
      status: normalizedStatus,
      businessId: resolvedBusinessId,
      tenantId: resolvedBusinessId,
      businessType: resolvedBusinessType || 'E_COMMERCE',
    });

    return {
      id: staff._id,
      email: staff.email,
      name: staff.name,
      role: staff.role,
      staffRole: staff.staffRole,
      status: staff.status,
      employeeId: staff.employeeId,
      businessType: staff.businessType,
    };
  }

  async getStaffUsers(businessId) {
    return await User.find({ role: 'staff', ...buildTenantScope(businessId) }).select('-password');
  }

  async updateStaff(staffId, updates, businessId) {
    const filter = { _id: staffId, role: 'staff' };
    if (businessId) {
      filter.businessId = businessId;
    }

    const staff = await User.findOne(filter);
    if (!staff) {
      throw new Error('Staff member not found');
    }

    const business = await Business.findById(staff.businessId).select('plan subscription.plan').lean();
    const currentPlan = resolveBusinessPlan(business);

    if (updates.email && updates.email !== staff.email) {
      const normalizedEmail = this.normalizeEmail(updates.email);
      const existingUser = await User.findOne({
        email: normalizedEmail,
        role: 'staff',
        _id: { $ne: staffId },
      });
      if (existingUser) {
        throw new Error('A staff member with this email already exists');
      }
      staff.email = normalizedEmail;
    }

    if (typeof updates.name === 'string') staff.name = updates.name;
    if (typeof updates.phone === 'string') staff.phone = updates.phone;
    if (updates.staffRole !== undefined) {
      const normalizedStaffRole = normalizeStaffRole(updates.staffRole);
      if (!normalizedStaffRole) {
        throw new Error('Invalid staff role');
      }
      if (!isStaffRoleAllowedInPlan(currentPlan, normalizedStaffRole)) {
        throw new Error(`${normalizedStaffRole} role is not allowed in ${currentPlan} plan`);
      }
      staff.staffRole = normalizedStaffRole;
    }
    if (typeof updates.gender === 'string') staff.gender = updates.gender;
    if (typeof updates.address === 'string') staff.address = updates.address;
    if (typeof updates.status === 'string') {
      const normalizedStatus = String(updates.status).trim().toUpperCase();
      if (!['ACTIVE', 'INACTIVE'].includes(normalizedStatus)) {
        throw new Error('Invalid staff status');
      }
      staff.status = normalizedStatus;
      staff.isActive = normalizedStatus === 'ACTIVE';
    } else if (typeof updates.isActive === 'boolean') {
      staff.isActive = updates.isActive;
      staff.status = updates.isActive ? 'ACTIVE' : 'INACTIVE';
    }
    if (Array.isArray(updates.permissions)) staff.permissions = updates.permissions;
    if (Object.prototype.hasOwnProperty.call(updates, 'dateOfBirth')) {
      staff.dateOfBirth = updates.dateOfBirth ? new Date(updates.dateOfBirth) : null;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'dateOfJoining')) {
      staff.dateOfJoining = updates.dateOfJoining ? new Date(updates.dateOfJoining) : null;
    }
    if (updates.password) {
      staff.password = await bcrypt.hash(updates.password, 10);
    }

    await staff.save();
    return await User.findById(staff._id).select('-password');
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

  async switchBusiness(userId, targetBusinessId) {
    const user = await User.findById(userId).populate('associatedBusinesses.businessId');
    if (!user) {
      throw new Error('User not found');
    }

    const businessEntry = user.associatedBusinesses.find(
      (b) => String(b.businessId?._id || b.businessId) === String(targetBusinessId)
    );

    if (!businessEntry && String(user.businessId) !== String(targetBusinessId)) {
      throw new Error('You do not have access to this business');
    }

    const targetBusiness = await Business.findById(targetBusinessId);
    if (!targetBusiness) {
      throw new Error('Business not found');
    }

    // Update active business context
    user.businessId = targetBusinessId;
    user.tenantId = targetBusinessId;
    user.role = businessEntry?.role || user.role;
    user.businessType = businessEntry?.businessType || targetBusiness.businessType;
    await user.save();

    const accessToken = jwt.sign(
      this.buildAccessTokenPayload(user, targetBusiness),
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      accessToken,
      user: this.buildUserResponse(user, targetBusiness),
    };
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
