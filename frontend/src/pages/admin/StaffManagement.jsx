import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUserPlus, FiUsers, FiMail, FiPhone, FiKey, FiMapPin, FiCalendar, FiActivity, FiX, FiCheck } from 'react-icons/fi';
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
      setFormSuccess('Personnel record established successfully.');
    } catch (error) {
      console.error('Error creating staff:', error);
      setFormError(error?.response?.data?.message || 'Failed to sync record.');
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
    return `ID-${year}-####`;
  };

  const deleteStaff = async (id) => {
    if (!confirm('Permanent deletion of this operative record?')) return;
    try {
      await api.delete(`/auth/staff/${id}`);
      fetchStaff();
    } catch (error) {
      console.error('Error deleting staff:', error);
    }
  };

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Staff Registry</h1>
          <p className="mt-2 text-slate-500 font-medium tracking-tight">Managing enterprise resource personnel and specialized access protocols.</p>
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
          className={`btn-primary px-10 h-14 rounded-2xl flex items-center gap-3 transition-all ${showForm ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20' : 'shadow-blue-500/20'}`}
        >
          {showForm ? <FiX className="h-5 w-5" /> : <FiUserPlus className="h-5 w-5" />}
          <span className="text-[10px] font-black uppercase tracking-widest">{showForm ? 'Abort Entry' : 'Enroll Personnel'}</span>
        </button>
      </header>

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
            onSubmit={handleCreateStaff} 
            className="saas-card p-12"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 opacity-30 blur-3xl" />
            
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-10 flex items-center gap-3">
               Operative Specification
               <span className="h-2 w-2 rounded-full bg-blue-600" />
            </h2>
            
            {formError && (
              <div className="mb-10 p-5 rounded-2xl bg-rose-50 border border-rose-100 text-[10px] font-black uppercase tracking-widest text-rose-600">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Identity (Name)</label>
                <div className="relative">
                   <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input
                     type="text"
                     name="name"
                     value={formData.name}
                     onChange={handleInputChange}
                     placeholder="e.g., Jonathan Sterling"
                     className="w-full rounded-xl border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm font-bold text-slate-700 outline-none transition-all"
                     required
                   />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Access Vector (Email)</label>
                <div className="relative">
                   <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input
                     type="email"
                     name="email"
                     value={formData.email}
                     onChange={handleInputChange}
                     placeholder="operative@enterprise.ia"
                     className="w-full rounded-xl border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm font-bold text-slate-700 outline-none transition-all"
                     required
                   />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Authentication Key (Password)</label>
                <div className="relative">
                   <FiKey className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input
                     type="password"
                     name="password"
                     value={formData.password}
                     onChange={handleInputChange}
                     placeholder="••••••••••••"
                     className="w-full rounded-xl border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm font-bold text-slate-700 outline-none transition-all"
                     required
                   />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10 border-t border-slate-50 pt-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Resource Type</label>
                <input type="text" value="SYSTEM OPERATIVE" className="w-full rounded-xl border-slate-100 bg-slate-50 px-5 py-3.5 text-[10px] font-black text-slate-400 tracking-widest cursor-not-allowed" readOnly />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">ID Matrix Preview</label>
                <input type="text" value={getEmployeeIdPreview()} className="w-full rounded-xl border-slate-100 bg-slate-50 px-5 py-3.5 text-[10px] font-black text-slate-400 tracking-widest cursor-not-allowed" readOnly />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Contact Coordinate (Phone)</label>
                <div className="relative">
                   <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input
                     type="text"
                     name="phone"
                     value={formData.phone}
                     onChange={handleInputChange}
                     placeholder="Network Signal"
                     className="w-full rounded-xl border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm font-bold text-slate-700 outline-none focus:bg-white transition-all"
                   />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10 border-t border-slate-50 pt-10">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Biometric Allocation</label>
                 <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full rounded-xl border-slate-200 bg-slate-50 px-5 py-3.5 text-[10px] font-black uppercase text-slate-600 outline-none focus:bg-white transition-all cursor-pointer">
                    <option value="Male">Alpha-Male</option>
                    <option value="Female">Alpha-Female</option>
                    <option value="Other">External Node</option>
                 </select>
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Existence Origin (DOB)</label>
                 <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange} className="w-full rounded-xl border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-black text-slate-600" />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Service Onset Date</label>
                 <input type="date" name="dateOfJoining" value={formData.dateOfJoining} onChange={handleInputChange} className="w-full rounded-xl border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-black text-slate-600" required />
               </div>
            </div>

            <div className="mb-10 border-t border-slate-50 pt-10">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Base Coordinate (Address)</label>
              <div className="relative mt-2">
                 <FiMapPin className="absolute left-4 top-4 text-slate-400" />
                 <textarea
                   name="address"
                   value={formData.address}
                   onChange={handleInputChange}
                   placeholder="Physical node location..."
                   className="w-full rounded-2xl border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-sm font-medium text-slate-700 outline-none transition-all min-h-[120px] resize-none"
                 />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-50 pt-10">
              <label className="flex items-center gap-4 cursor-pointer group">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="h-6 w-6 rounded-lg border-slate-300 text-slate-900 focus:ring-slate-900/10 transition-all cursor-pointer"
                />
                <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-900 transition-colors uppercase tracking-[0.2em] select-none">Operative Active Baseline</span>
              </label>

              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary px-16 h-16 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest shadow-none"
              >
                {isSaving ? 'Synchronizing...' : 'Finalize Module Enlistment'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Database Interface */}
      <div className="saas-card flex flex-col min-h-[600px]">
        <header className="px-10 py-8 border-b border-slate-50 bg-slate-50/20 flex items-center justify-between">
           <div>
              <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Personnel Matrix</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">Audit Trail • {staff.length} Active Modules</p>
           </div>
           <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
              <FiUsers className="h-5 w-5" />
           </div>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Personnel Node</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Matrix ID</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">System State</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Utility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {staff.map((s) => (
                <tr key={s._id} className="group hover:bg-slate-50 transition-colors duration-300">
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-5">
                      <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-sm ring-4 ring-white shadow-xl shadow-slate-900/10 group-hover:scale-110 transition-transform duration-500">
                        {s.name ? s.name[0].toUpperCase() : '?'}
                      </div>
                      <div>
                        <p className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{s.name}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-7">
                    <p className="text-xs font-black text-slate-600 tracking-tighter bg-slate-100 w-fit px-3 py-1 rounded-lg border border-slate-200/50">{s.employeeId || 'UNREGISTERED'}</p>
                  </td>
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-3">
                       <div className={`h-2.5 w-2.5 rounded-full ring-4 ring-white shadow-sm ${s.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                       <span className={`text-[10px] font-black uppercase tracking-widest ${s.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {s.isActive ? 'Operational' : 'Deactivated'}
                       </span>
                    </div>
                  </td>
                  <td className="px-10 py-7 text-right">
                    <button
                      onClick={() => deleteStaff(s._id)}
                      className="btn-secondary py-2 px-5 text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all border-rose-100 text-rose-500 hover:bg-rose-500 hover:text-white"
                    >
                      Expunge Record
                    </button>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                   <td colSpan={4} className="py-24 text-center opacity-30 select-none grayscale">
                      <FiActivity className="h-20 w-20 mx-auto mb-6 text-slate-300" />
                      <p className="font-black uppercase tracking-[0.4em] text-sm italic text-slate-400">Database Buffer Depleted</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="mt-auto px-10 py-8 border-t border-slate-50 bg-slate-50/10">
           <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] text-center italic">Secure Enterprise Registry Interface • Root Managed</p>
        </footer>
      </div>
    </div>
  );
};

export default StaffManagement;
