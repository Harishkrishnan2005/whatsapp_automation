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
  const [usage, setUsage] = useState({ staffCount: 0, maxUsers: null });
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    fetchStaff();
    fetchSubscription();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await api.get('/auth/staff');
      setStaff(response.data);
      setUsage(prev => ({ ...prev, staffCount: response.data.length }));
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchSubscription = async () => {
    try {
      const response = await api.get('/subscription/status');
      setSubscription(response.data);
      setUsage(prev => ({ ...prev, maxUsers: response.data.limits.maxUsers }));
    } catch (error) {
      console.error('Error fetching subscription:', error);
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
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none uppercase italic">Staff Team</h1>
          <p className="mt-2 text-slate-500 font-medium tracking-tight">Add and manage your team members and their permissions.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col items-center">
             <div className="flex items-center justify-between gap-4 mb-1.5 w-full">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Seats Used</p>
               <p className="text-[10px] font-black text-blue-600 leading-none">
                 {usage.staffCount} / {usage.maxUsers === Infinity || usage.maxUsers === null ? '∞' : usage.maxUsers}
               </p>
             </div>
             <div className="h-1 w-24 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
               <div 
                 className="h-full bg-blue-600 transition-all duration-1000"
                 style={{ width: `${Math.min(100, (usage.staffCount / (usage.maxUsers || 1)) * 100)}%` }}
               />
             </div>
          </div>
          <button 
            onClick={() => window.location.assign('/pricing')}
            className="h-14 px-6 rounded-2xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
          >
            Upgrade
          </button>
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
            <span className="text-[10px] font-black uppercase tracking-widest">{showForm ? 'Cancel' : 'Add Staff Member'}</span>
          </button>
        </div>
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
               Staff Details
               <span className="h-2 w-2 rounded-full bg-blue-600" />
            </h2>
            
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
                   />
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Password</label>
                   <input
                     type="password"
                     name="password"
                     value={formData.password}
                     onChange={handleInputChange}
                     placeholder="••••••••"
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

              <div className="flex items-center gap-6 pt-4 border-t border-slate-50">
                 <button 
                   type="button"
                   onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
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
                   {isSaving ? 'Saving...' : 'Add Team Member'}
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
                 <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                 <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
               {staff.map((s) => (
                 <tr key={s._id} className="group hover:bg-slate-50 transition-colors duration-300">
                   <td className="px-10 py-7">
                     <div className="flex items-center gap-5">
                       <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-sm ring-4 ring-white shadow-sm group-hover:scale-110 transition-transform duration-500">
                          {s.name ? s.name[0].toUpperCase() : '?'}
                       </div>
                       <div>
                          <p className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight uppercase leading-none">{s.name}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">{s.email}</p>
                       </div>
                     </div>
                   </td>
                   <td className="px-10 py-7">
                     <p className="text-sm font-black text-slate-900 tracking-tighter bg-slate-50 w-fit px-3 py-1 rounded-lg border border-slate-100 uppercase">{s.employeeId || s._id.slice(-6)}</p>
                   </td>
                   <td className="px-10 py-7">
                    <div className="flex items-center gap-3">
                       <div className={`h-2.5 w-2.5 rounded-full ring-4 ring-white shadow-sm ${s.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                       <span className={`text-[10px] font-black uppercase tracking-widest ${s.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {s.isActive ? 'Active' : 'Hidden'}
                       </span>
                    </div>
                  </td>
                  <td className="px-10 py-7 text-right">
                    <div className="flex justify-end gap-5 items-center opacity-0 group-hover:opacity-100 transition-all">
                       <button 
                         onClick={() => deleteStaff(s._id)} 
                         className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                       >
                          Delete Staff
                       </button>
                    </div>
                  </td>
                 </tr>
               ))}
               {staff.length === 0 && (
                 <tr>
                    <td colSpan={4} className="py-24 text-center opacity-30 select-none">
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
