import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUserPlus, FiUsers, FiX, FiCheck, FiEdit2, FiTrash2, FiShield } from 'react-icons/fi';
import api from '../../utils/api';
import { PLAN_CONFIG, STAFF_ROLE_MIN_PLAN, getAllowedStaffRolesForPlan } from '../../config/plans.js';
import { useAuth } from '../../context/AuthContext';

const initialFormData = {
  name: '',
  email: '',
  password: '',
  phone: '',
  staffRole: 'SUPPORT',
  status: 'ACTIVE',
  gender: 'Male',
  dateOfBirth: '',
  dateOfJoining: '',
  address: '',
  isActive: true,
  permissions: [],
};

const ALL_ROLE_OPTIONS = ['SUPPORT', 'SALES', 'MARKETING', 'MANAGER'];

const fieldLabelClass = 'px-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600';
const fieldInputClass = 'w-full rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.05)] outline-none transition-all placeholder:font-semibold placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10';
const fieldInputCompactClass = 'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-sm font-semibold text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.05)] outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10';
const readOnlyFieldClass = 'w-full rounded-2xl border border-slate-200 bg-slate-100 px-5 py-3.5 text-[10px] font-black tracking-[0.18em] text-slate-600 cursor-not-allowed';

const toInputDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
};

const StaffManagement = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [usage, setUsage] = useState({ staffCount: 0, maxUsers: null, plan: user?.plan || 'FREE' });

  useEffect(() => {
    fetchStaff();
    fetchSubscription();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await api.get('/admin/staff');
      const rows = response.data || [];
      setStaff(rows);
      setUsage((prev) => ({ ...prev, staffCount: rows.length || 0 }));
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchSubscription = async () => {
    try {
      const response = await api.get('/admin/billing/subscription/status');
      setUsage((prev) => ({
        ...prev,
        maxUsers: response.data?.limits?.maxUsers ?? null,
        plan: response.data?.plan || user?.plan || 'FREE',
      }));
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const activePlan = usage.plan || user?.plan || 'FREE';
  const allowedRoleOptions = getAllowedStaffRolesForPlan(activePlan);
  const selectableRoleOptions = editingStaffId && formData.staffRole && !allowedRoleOptions.includes(formData.staffRole)
    ? [formData.staffRole, ...allowedRoleOptions]
    : allowedRoleOptions;
  const lockedRoles = ALL_ROLE_OPTIONS.filter((role) => !allowedRoleOptions.includes(role));
  const upgradeHints = lockedRoles.map((role) => ({
    role,
    requiredPlan: STAFF_ROLE_MIN_PLAN[role] || 'ENTERPRISE',
  }));

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingStaffId(null);
    setFormError('');
  };

  const openCreateForm = () => {
    setFormSuccess('');
    if (allowedRoleOptions.length === 0) {
      setFormError('Upgrade to BASIC to enable staff roles.');
      setShowForm(false);
      return;
    }
    if (showForm && !editingStaffId) {
      setShowForm(false);
      resetForm();
      return;
    }

    resetForm();
    setFormData(() => ({
      ...initialFormData,
      staffRole: allowedRoleOptions[0] || 'SUPPORT',
    }));
    setShowForm(true);
  };

  const openEditForm = (member) => {
    setFormSuccess('');
    setFormError('');
    setEditingStaffId(member._id);
    setFormData({
      name: member.name || '',
      email: member.email || '',
      password: '',
      phone: member.phone || '',
      staffRole: member.staffRole || 'SUPPORT',
      status: member.status || (member.isActive ? 'ACTIVE' : 'INACTIVE'),
      gender: member.gender || 'Male',
      dateOfBirth: toInputDate(member.dateOfBirth),
      dateOfJoining: toInputDate(member.dateOfJoining),
      address: member.address || '',
      isActive: member.isActive ?? true,
      permissions: Array.isArray(member.permissions) ? member.permissions : [],
    });
    setShowForm(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleActive = () => {
    setFormData((prev) => ({
      ...prev,
      isActive: !prev.isActive,
      status: prev.isActive ? 'INACTIVE' : 'ACTIVE',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setIsSaving(true);

    const payload = {
      ...formData,
      name: String(formData.name || '').trim(),
      email: String(formData.email || '').trim().toLowerCase(),
      phone: String(formData.phone || '').trim(),
      address: String(formData.address || '').trim(),
      dateOfBirth: formData.dateOfBirth || '',
      dateOfJoining: formData.dateOfJoining || '',
      status: formData.status || (formData.isActive ? 'ACTIVE' : 'INACTIVE'),
    };

    if (!editingStaffId && !payload.password) {
      setFormError('Password is required for new staff members.');
      setIsSaving(false);
      return;
    }

    if (!editingStaffId && allowedRoleOptions.length === 0) {
      setFormError('Upgrade to BASIC to enable staff roles.');
      setIsSaving(false);
      return;
    }

    if (editingStaffId && !payload.password) {
      delete payload.password;
    }

    try {
      if (editingStaffId) {
        await api.put(`/admin/staff/${editingStaffId}`, payload);
        setFormSuccess('Personnel record updated successfully.');
      } else {
        await api.post('/admin/staff', payload);
        setFormSuccess('Personnel record established successfully.');
      }

      await fetchStaff();
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Error saving staff:', error);
      const validationErrors = Array.isArray(error?.response?.data?.errors)
        ? error.response.data.errors
            .map((item) => item?.message)
            .filter(Boolean)
        : [];
      setFormError(
        validationErrors.length > 0
          ? validationErrors.join(' | ')
          : (error?.response?.data?.message || 'Failed to sync record.')
      );
    } finally {
      setIsSaving(false);
    }
  };

  const deleteStaff = async (id) => {
    if (!confirm('Permanent deletion of this operative record?')) return;
    try {
      await api.delete(`/admin/staff/${id}`);
      await fetchStaff();
      if (editingStaffId === id) {
        setShowForm(false);
        resetForm();
      }
      setFormSuccess('Staff record removed successfully.');
    } catch (error) {
      console.error('Error deleting staff:', error);
      setFormError(error?.response?.data?.message || 'Failed to delete staff member.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Header & Command Center */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
             <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staff Team</h1>
             <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Personnel Infrastructure</span>
          </div>
          <p className="mt-1 text-slate-500 font-medium tracking-tight">Managing operational operatives and permission hierarchies.</p>
        </div>

        <div className="flex items-center gap-4 w-full xl:w-auto">
          <div className="flex-1 xl:w-64 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
             <div className="flex justify-between items-center mb-1.5">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Operative Seats</p>
                <p className="text-[9px] font-black text-blue-600 leading-none">
                  {usage.staffCount} / {usage.maxUsers || '∞'}
                </p>
             </div>
             <div className="h-1 bg-slate-50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-1000"
                  style={{ width: `${Math.min(100, (usage.staffCount / (usage.maxUsers || 10)) * 100)}%` }}
                />
             </div>
          </div>
          <button
            onClick={openCreateForm}
            disabled={allowedRoleOptions.length === 0}
            className={`h-14 px-8 rounded-2xl flex items-center gap-3 transition-all duration-500 ${
              showForm && !editingStaffId 
                ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/20' 
                : 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 hover:bg-black'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {showForm && !editingStaffId ? <FiX className="h-5 w-5" /> : <FiUserPlus className="h-5 w-5" />}
            <span className="text-[10px] font-black uppercase tracking-widest">{showForm && !editingStaffId ? 'Abort' : 'Register Operative'}</span>
          </button>
        </div>
      </div>

      <section className="grid gap-6 sm:grid-cols-3">
        {[
          { label: 'Total Operatives', val: staff.length, icon: FiUsers, col: 'blue' },
          { label: 'Active Signals', val: staff.filter(s => s.isActive).length, icon: FiCheck, col: 'emerald' },
          { label: 'Managers', val: staff.filter(s => s.staffRole === 'MANAGER').length, icon: FiShield, col: 'indigo' },
        ].map((s, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm flex items-center gap-6 group hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-500"
          >
            <div className={`h-14 w-14 rounded-2xl bg-${s.col}-50 flex items-center justify-center text-${s.col}-600`}>
              <s.icon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{s.val}</p>
              <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-widest leading-none">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </section>

      <AnimatePresence>
        {formSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center justify-between rounded-[1.5rem] border border-blue-200 bg-blue-50 px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-blue-700 shadow-sm"
          >
            <span>{formSuccess}</span>
            <FiCheck className="h-4 w-4" />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onSubmit={handleSubmit}
            className="saas-card p-12"
          >
            <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-blue-100 -mr-32 -mt-32 opacity-60 blur-3xl" />

            <div className="flex items-center justify-between mb-10 gap-4">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                {editingStaffId ? 'Edit Staff Member' : 'Staff Details'}
                <span className="h-2 w-2 rounded-full bg-blue-600" />
              </h2>
              {editingStaffId && (
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900"
                >
                  Close Editor
                </button>
              )}
            </div>

            {formError && (
              <div className="mb-10 rounded-[1.75rem] border border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 px-5 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-amber-900 shadow-[0_10px_30px_rgba(245,158,11,0.12)]">
                {formError}
              </div>
            )}

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className={fieldLabelClass}>Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter staff name"
                    className={fieldInputClass}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className={fieldLabelClass}>Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="staff@business.com"
                    className={fieldInputClass}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className={fieldLabelClass}>
                    Password {editingStaffId ? '(leave blank to keep current)' : ''}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder={editingStaffId ? 'Optional update' : 'Enter password'}
                    className={fieldInputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label className={fieldLabelClass}>User Type</label>
                  <input type="text" value="STAFF MEMBER" className={readOnlyFieldClass} readOnly />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className={fieldLabelClass}>Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                    className={fieldInputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className={fieldLabelClass}>Staff Role</label>
                    <select
                      name="staffRole"
                      value={formData.staffRole}
                      onChange={handleInputChange}
                      className={`${fieldInputCompactClass} cursor-pointer`}
                    >
                      {selectableRoleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                    {editingStaffId && formData.staffRole && !allowedRoleOptions.includes(formData.staffRole) && (
                      <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-amber-800">
                        Upgrade to {STAFF_ROLE_MIN_PLAN[formData.staffRole] || 'ENTERPRISE'} to keep using {formData.staffRole} role
                      </p>
                    )}
                    {upgradeHints.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {upgradeHints.map((hint) => (
                          <p key={hint.role} className="rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-orange-800">
                            Upgrade to {hint.requiredPlan} to enable {hint.role} role
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className={fieldLabelClass}>Joining Date</label>
                    <input
                      type="date"
                      name="dateOfJoining"
                      value={formData.dateOfJoining}
                      onChange={handleInputChange}
                      className={fieldInputCompactClass}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className={fieldLabelClass}>Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className={fieldInputClass}
                />
              </div>

              <div className="space-y-2">
                <label className={fieldLabelClass}>Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter full address"
                  className="w-full resize-none rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-medium text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.05)] outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  rows="3"
                />
              </div>

              <div className="flex items-center gap-6 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={toggleActive}
                  className="group flex items-center gap-3 cursor-pointer"
                >
                  <div className={`h-6 w-11 rounded-full transition-all duration-300 flex items-center px-1 ${formData.isActive ? 'bg-blue-600' : 'bg-slate-200'}`}>
                    <div className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${formData.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                  <span className="select-none text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 transition-colors group-hover:text-slate-900">Account Active</span>
                </button>
                <div className="rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700">
                  Status: {formData.status}
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary flex-1 py-5 rounded-2xl shadow-xl shadow-blue-500/10 text-[10px] font-black uppercase tracking-widest"
                >
                  {isSaving ? 'Saving...' : editingStaffId ? 'Update Team Member' : 'Add Team Member'}
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        <header className="px-10 py-8 border-b border-slate-50 bg-slate-50/20 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Staff Members</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">View and manage your team • {staff.length} staff total</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <FiUsers className="h-6 w-6" />
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Staff Member</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Staff ID</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Role</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {staff.map((member) => (
                <tr key={member._id} className="group hover:bg-slate-50 transition-colors duration-300">
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-5">
                      <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-sm ring-4 ring-white shadow-sm group-hover:scale-110 transition-transform duration-500">
                        {member.name ? member.name[0].toUpperCase() : '?'}
                      </div>
                      <div>
                        <p className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight uppercase leading-none">{member.name}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">{member.email}</p>
                        {member.phone && <p className="text-[10px] font-bold text-slate-400 mt-1">{member.phone}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-7">
                    <p className="text-sm font-black text-slate-900 tracking-tighter bg-slate-50 w-fit px-3 py-1 rounded-lg border border-slate-100 uppercase">{member.employeeId || member._id.slice(-6)}</p>
                  </td>
                  <td className="px-10 py-7">
                    <span className="px-3 py-1 rounded-lg bg-slate-50 border border-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      {member.staffRole || 'SUPPORT'}
                    </span>
                  </td>
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-3">
                      <div className={`h-2.5 w-2.5 rounded-full ring-4 ring-white shadow-sm ${(member.status || (member.isActive ? 'ACTIVE' : 'INACTIVE')) === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${(member.status || (member.isActive ? 'ACTIVE' : 'INACTIVE')) === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {member.status || (member.isActive ? 'ACTIVE' : 'INACTIVE')}
                      </span>
                    </div>
                  </td>
                  <td className="px-10 py-7 text-right">
                    <div className="flex justify-end gap-3 items-center opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => openEditForm(member)}
                        className="inline-flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                      >
                        <FiEdit2 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => deleteStaff(member._id)}
                        className="inline-flex items-center gap-2 text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                      >
                        <FiTrash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-24 text-center opacity-30 select-none">
                    <div className="flex flex-col items-center">
                      <FiUsers className="h-16 w-16 mb-4 text-slate-300" />
                      <p className="font-black uppercase tracking-[0.4em] text-sm italic text-slate-400">No Staff Found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="mt-auto px-10 py-8 border-t border-slate-50 bg-slate-50/10">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] text-center italic">Secure Staff Portal • Admin Managed</p>
        </footer>
      </div>
    </div>
  );
};

export default StaffManagement;
