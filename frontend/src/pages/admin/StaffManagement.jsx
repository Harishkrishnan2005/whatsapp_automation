import { useState, useEffect } from 'react';
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
};

const StaffManagement = () => {
  const [staff, setStaff] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await api.get('/auth/staff');
      setStaff(response.data);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setIsSaving(true);

    try {
      const permissions = ['handle_chats', 'view_analytics'];
      await api.post('/auth/staff', { ...formData, permissions });
      setFormData(initialFormData);
      setShowForm(false);
      await fetchStaff();
      setFormSuccess('Employee saved successfully.');
    } catch (error) {
      console.error('Error creating staff:', error);
      setFormError(error?.response?.data?.message || 'Failed to save employee.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const getEmployeeIdPreview = () => {
    const year = formData.dateOfJoining
      ? new Date(formData.dateOfJoining).getFullYear()
      : new Date().getFullYear();
    return `EMPID-${year}-####`;
  };

  const deleteStaff = async (id) => {
    try {
      await api.delete(`/auth/staff/${id}`);
      fetchStaff();
    } catch (error) {
      console.error('Error deleting staff:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 md:p-8 text-white">
      <div className="mb-8 flex justify-between items-center rounded-2xl backdrop-blur-md border border-white/10 shadow-xl bg-slate-950/30 p-6">
        <div>
          <h1 className="text-4xl font-bold text-white">Staff Management</h1>
          <p className="text-cyan-200 mt-2">Manage and organize your staff members.</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setFormSuccess('');
            if (showForm) {
              setFormData(initialFormData);
              setFormError('');
            }
          }}
          className="bg-blue-500/80 hover:bg-blue-600/80 backdrop-blur-sm border border-blue-400/50 text-white px-6 py-3 rounded-xl font-semibold transition-all"
        >
          {showForm ? 'Cancel' : 'Add Staff'}
        </button>
      </div>

      {formSuccess && (
        <div className="mb-6 rounded-2xl backdrop-blur-md border border-green-200/50 bg-green-50/80 p-4 text-green-700">
          {formSuccess}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreateStaff} className="rounded-2xl backdrop-blur-md border border-white/10 shadow-xl bg-slate-950/30 p-6 mb-8">
          {formError && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm p-4 text-red-100">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Name</label>
              <input
                type="text"
                name="name"
                placeholder="Staff Name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-white/10 bg-slate-900/40 backdrop-blur-sm rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Email</label>
              <input
                type="email"
                name="email"
                placeholder="staff@example.com"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-white/10 bg-slate-900/40 backdrop-blur-sm rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Password</label>
              <input
                type="password"
                name="password"
                placeholder="Create password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-white/10 bg-slate-900/40 backdrop-blur-sm rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Employee Type</label>
              <input
                type="text"
                value="Employee"
                className="w-full px-4 py-3 border border-white/10 bg-slate-900/30 backdrop-blur-sm rounded-xl text-slate-300"
                readOnly
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Employee ID</label>
              <input
                type="text"
                value={getEmployeeIdPreview()}
                className="w-full px-4 py-3 border border-white/10 bg-slate-900/30 backdrop-blur-sm rounded-xl text-slate-300"
                readOnly
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Phone Number</label>
              <input
                type="text"
                name="phone"
                placeholder="9876543210"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-white/10 bg-slate-900/40 backdrop-blur-sm rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-white/10 bg-slate-900/40 backdrop-blur-sm rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none text-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Date Of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-white/10 bg-slate-900/40 backdrop-blur-sm rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Date Of Joining</label>
              <input
                type="date"
                name="dateOfJoining"
                value={formData.dateOfJoining}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-white/10 bg-slate-900/40 backdrop-blur-sm rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none text-white"
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Address</label>
            <textarea
              name="address"
              placeholder="Enter address"
              value={formData.address}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-white/10 bg-slate-900/40 backdrop-blur-sm rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none resize-none min-h-[120px] text-white"
            />
          </div>

          <div className="mb-6">
            <label className="inline-flex items-center gap-3 text-slate-300 font-medium">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="h-4 w-4 rounded border-white/10 bg-slate-900/40 backdrop-blur-sm focus:ring-cyan-400"
              />
              Active
            </label>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="bg-green-500/80 hover:bg-green-600/80 backdrop-blur-sm border border-green-400/50 text-white px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Staff'}
          </button>
        </form>
      )}

      <div className="rounded-2xl backdrop-blur-md border border-white/10 shadow-xl bg-slate-950/30 overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-white/10 bg-slate-950/20 backdrop-blur-sm">
            <tr>
              <th className="p-4 text-left text-cyan-200 font-semibold">Name</th>
              <th className="p-4 text-left text-cyan-200 font-semibold">Email</th>
              <th className="p-4 text-left text-cyan-200 font-semibold">Employee ID</th>
              <th className="p-4 text-left text-slate-300 font-semibold">Status</th>
              <th className="p-4 text-left text-slate-300 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s._id} className="border-b border-white/10 hover:bg-blue-500/10 backdrop-blur-sm transition-colors">
                <td className="p-4 text-white">{s.name}</td>
                <td className="p-4 text-slate-300">{s.email}</td>
                <td className="p-4 text-slate-300">{s.employeeId || '-'}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    s.isActive
                      ? 'bg-green-500/10 backdrop-blur-sm border border-green-500/20 text-green-100'
                      : 'bg-slate-900/40 backdrop-blur-sm border border-white/10 text-slate-300'
                  }`}>
                    {s.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => deleteStaff(s._id)}
                    className="bg-red-500/80 hover:bg-red-600/80 backdrop-blur-sm border border-red-400/50 text-white px-3 py-1 rounded-lg text-sm font-medium transition-all"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StaffManagement;
