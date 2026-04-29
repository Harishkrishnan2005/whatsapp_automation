import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUserPlus, FiUsers, FiX, FiCheck, FiEdit2, FiTrash2, FiShield } from 'react-icons/fi';
import api from '../../utils/api';

const initialFormData = {
  name: '',
  email: '',
  password: '',
  phone: '',
  gender: 'Male',
  dateOfBirth: '',
  dateOfJoining: '',
  address: '',
  isActive: true,
  permissions: ['handle_chats', 'view_analytics'],
};

const permissionOptions = [
  { id: 'handle_chats', label: 'Handle Chats' },
  { id: 'view_analytics', label: 'View Analytics' },
  { id: 'manage_appointments', label: 'Manage Appointments' },
];

const toInputDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
};

const StaffManagement = () => {
  const [staff, setStaff] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [usage, setUsage] = useState({ staffCount: 0, maxUsers: null });

  useEffect(() => {
    fetchStaff();
    fetchSubscription();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await api.get('/auth/staff');
      setStaff(response.data || []);
      setUsage((prev) => ({ ...prev, staffCount: response.data?.length || 0 }));
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchSubscription = async () => {
    try {
      const response = await api.get('/admin/billing/subscription/status');
      setUsage((prev) => ({ ...prev, maxUsers: response.data?.limits?.maxUsers ?? null }));
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingStaffId(null);
    setFormError('');
  };

  const openCreateForm = () => {
    setFormSuccess('');
    if (showForm && !editingStaffId) {
      setShowForm(false);
      resetForm();
      return;
    }

    resetForm();
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
    setFormData((prev) => ({ ...prev, isActive: !prev.isActive }));
  };

  const togglePermission = (permissionId) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter((permission) => permission !== permissionId)
        : [...prev.permissions, permissionId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setIsSaving(true);

    const payload = {
      ...formData,
      dateOfBirth: formData.dateOfBirth || '',
      dateOfJoining: formData.dateOfJoining || '',
    };

    if (!editingStaffId && !payload.password) {
      setFormError('Password is required for new staff members.');
      setIsSaving(false);
      return;
    }

    if (editingStaffId && !payload.password) {
      delete payload.password;
    }

    try {
      if (editingStaffId) {
        await api.put(`/auth/staff/${editingStaffId}`, payload);
        setFormSuccess('Personnel record updated successfully.');
      } else {
        await api.post('/auth/staff', payload);
        setFormSuccess('Personnel record established successfully.');
      }

      await fetchStaff();
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Error saving staff:', error);
      setFormError(error?.response?.data?.message || 'Failed to sync record.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteStaff = async (id) => {
    if (!confirm('Permanent deletion of this operative record?')) return;
    try {
      await api.delete(`/auth/staff/${id}`);
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
            className={`h-14 px-8 rounded-2xl flex items-center gap-3 transition-all duration-500 ${
              showForm && !editingStaffId 
                ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/20' 
                : 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 hover:bg-black'
            }`}
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
          { label: 'Tier Level', val: 'Elite', icon: FiShield, col: 'indigo' },
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
            className="p-5 rounded-[1.5rem] bg-blue-50 border border-blue-100 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 flex items-center justify-between"
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
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 opacity-30 blur-3xl" />

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
                  className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900"
                >
                  Close Editor
                </button>
              )}
            </div>

            {formError && (
              <div className="mb-10 p-5 rounded-2xl bg-rose-50 border border-rose-100 text-[10px] font-black uppercase tracking-widest text-rose-600">
                {formError}
              </div>
            )}

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter staff name"
                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="staff@business.com"
                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Password {editingStaffId ? '(leave blank to keep current)' : ''}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder={editingStaffId ? 'Optional update' : 'Enter password'}
                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">User Type</label>
                  <input type="text" value="STAFF MEMBER" className="w-full rounded-xl border-slate-100 bg-slate-50 px-5 py-3.5 text-[10px] font-black text-slate-400 tracking-widest cursor-not-allowed" readOnly />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Gender</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3.5 text-xs font-bold text-slate-600 outline-none focus:bg-white transition-all cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Joining Date</label>
                    <input
                      type="date"
                      name="dateOfJoining"
                      value={formData.dateOfJoining}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3.5 text-xs font-bold text-slate-600 outline-none focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter full address"
                  className="w-full rounded-xl border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-medium text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all resize-none"
                  rows="3"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Permissions</label>
                <div className="grid gap-3 md:grid-cols-3">
                  {permissionOptions.map((permission) => {
                    const selected = formData.permissions.includes(permission.id);
                    return (
                      <button
                        key={permission.id}
                        type="button"
                        onClick={() => togglePermission(permission.id)}
                        className={`rounded-2xl border px-4 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                          selected
                            ? 'border-blue-200 bg-blue-50 text-blue-600'
                            : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-700'
                        }`}
                      >
                        {permission.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-6 pt-4 border-t border-slate-50">
                <button
                  type="button"
                  onClick={toggleActive}
                  className="group flex items-center gap-3 cursor-pointer"
                >
                  <div className={`h-6 w-11 rounded-full transition-all duration-300 flex items-center px-1 ${formData.isActive ? 'bg-blue-600' : 'bg-slate-200'}`}>
                    <div className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${formData.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-900 transition-colors uppercase tracking-[0.2em] select-none">Account Active</span>
                </button>

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
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Permissions</th>
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
                    <div className="flex flex-wrap gap-2">
                      {(member.permissions || []).length === 0 ? (
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">No permissions</span>
                      ) : (
                        member.permissions.map((permission) => (
                          <span key={permission} className="px-3 py-1 rounded-lg bg-slate-50 border border-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            {permission.replaceAll('_', ' ')}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-3">
                      <div className={`h-2.5 w-2.5 rounded-full ring-4 ring-white shadow-sm ${member.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${member.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {member.isActive ? 'Active' : 'Hidden'}
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
