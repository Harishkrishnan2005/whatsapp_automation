import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBriefcase, FiArrowRight, FiShield } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const AdminLogin = () => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('admin@test.com');
  const [password, setPassword] = useState('admin123');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('E_COMMERCE');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, registerAdmin } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await login(email, password, 'admin');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await registerAdmin({ name, email, password, businessName, businessType });
      setSuccess('Administrative identity established. Please verify credentials.');
      setMode('login');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registry synchronization failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] p-4 lg:p-0">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex w-full max-w-[1000px] overflow-hidden rounded-[2.5rem] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100"
      >
        {/* Left Section: Core Interface */}
        <div className="flex w-full flex-col p-6 md:p-10 md:w-[55%]">
          <header className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/20">
                <FiShield className="h-5 w-5" />
              </div>
              <span className="text-xl font-extrabold tracking-tighter text-slate-900 uppercase">Ematix<span className="text-blue-600">.</span></span>
            </div>
          </header>

          <main className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
            <div className="mb-6">
               <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
                 {mode === 'login' ? 'Admin Login' : 'Create Account'}
               </h1>
               <p className="mt-2 text-sm text-slate-500 font-medium">
                 {mode === 'login' ? 'Sign in to manage your account.' : 'Sign up to start your business.'}
               </p>
            </div>

            {error && <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-xs font-bold text-rose-700">{error}</div>}
            {success && <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-100 text-xs font-bold text-blue-700">{success}</div>}

            <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-5">
              <AnimatePresence mode="wait">
                {mode === 'register' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="grid gap-5 mb-5"
                  >
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</label>
                      <input 
                        type="text" value={name} onChange={e => setName(e.target.value)}
                        className="mt-2 w-full rounded-2xl border-slate-200 bg-slate-50/50 p-4 text-sm font-bold text-slate-700 outline-none transition-all"
                        placeholder="John Doe" required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Business Name</label>
                      <input 
                        type="text" value={businessName} onChange={e => setBusinessName(e.target.value)}
                        className="mt-2 w-full rounded-2xl border-slate-200 bg-slate-50/50 p-4 text-sm font-bold text-slate-700 outline-none transition-all"
                        placeholder="Global Dynamics" required
                      />
                    </div>
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Business Type</label>
                       <select 
                         value={businessType} onChange={e => setBusinessType(e.target.value)}
                         className="mt-2 w-full rounded-2xl border-slate-200 bg-slate-50/50 p-4 text-sm font-bold text-slate-700 outline-none transition-all cursor-pointer"
                       >
                         <option value="E_COMMERCE">E-Commerce</option>
                         <option value="BOOKING">Booking / Appointments</option>
                       </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</label>
                <input 
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-2xl border-slate-200 bg-slate-50/50 p-4 text-sm font-bold text-slate-700 outline-none transition-all"
                  placeholder="admin@ematix.ia" required
                />
              </div>

              <div>
                <div className="flex justify-between items-center px-1">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Password</label>
                   {mode === 'login' && <button type="button" className="text-[10px] font-black uppercase text-blue-600 tracking-tighter hover:underline">Lost access?</button>}
                </div>
                <input 
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-2xl border-slate-200 bg-slate-50/50 p-4 text-sm font-bold text-slate-700 outline-none transition-all"
                  placeholder="••••••••" required
                />
              </div>

              <button 
                type="submit" disabled={loading}
                className="btn-primary w-full py-5 rounded-[1.5rem] mt-4 shadow-xl shadow-blue-500/10"
              >
                {loading ? 'Starting...' : mode === 'login' ? 'Login' : 'Sign Up'}
                {!loading && <FiArrowRight className="inline ml-2" />}
              </button>
            </form>

            <div className="mt-6 text-center bg-slate-50 p-4 rounded-3xl border border-dotted border-slate-200">
               <span className="text-xs font-medium text-slate-400">
                  {mode === 'login' ? "New user?" : "Already have an account?"}
               </span>
               <button 
                 onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                 className="ml-2 text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors"
               >
                 {mode === 'login' ? 'Register' : 'Login'}
               </button>
            </div>
          </main>

          <footer className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center opacity-40 hover:opacity-100 transition-opacity">
             <button onClick={() => navigate('/staff/login')} className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 hover:text-blue-600 flex items-center gap-2">
                Staff Login
             </button>
             <button onClick={() => navigate('/superadmin/login')} className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 hover:text-blue-600 flex items-center gap-2">
                Super Admin
             </button>
          </footer>
        </div>

        {/* Right Section: Aesthetic Visualization */}
        <div className="hidden w-[45%] bg-[#2563eb] p-10 md:flex md:flex-col md:justify-between relative overflow-hidden">
           {/* Dynamic Gradients */}
           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-400/20 rounded-full -mr-40 -mt-40 blur-[120px]" />
           <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-700/30 rounded-full -ml-40 -mb-40 blur-[120px]" />
           
           <div className="relative z-10">
              <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-10">
                 <FiBriefcase className="text-white text-2xl" />
              </div>
              <h2 className="text-6xl font-black text-white leading-[1.05] tracking-tighter">
                Orchestrate <br/> Real-time <br/> 
                <span className="opacity-40 italic">Engagement.</span>
              </h2>
           </div>

           <div className="relative z-10">
              <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl">
                 <p className="text-blue-200 text-xs font-black uppercase tracking-[0.3em] mb-4">Customer Success</p>
                 <p className="text-xl font-medium text-white leading-relaxed italic">
                    "Our automated chatbot has made talking to customers so much easier and helped us grow our sales faster than ever."
                 </p>
                 <div className="mt-8 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-blue-500 shadow-xl border-2 border-white/10" />
                    <div>
                       <p className="text-white text-sm font-black">Marcus V.</p>
                       <p className="text-blue-200/60 text-[10px] font-bold">Solutions Architect</p>
                    </div>
                 </div>
              </div>
              <div className="mt-10 flex gap-6 px-4">
                 <div className="text-center">
                    <p className="text-2xl font-black text-white">12k+</p>
                    <p className="text-blue-200/50 text-[9px] font-black uppercase tracking-widest mt-1">Nodes</p>
                 </div>
                 <div className="w-[1px] bg-white/10" />
                 <div className="text-center">
                    <p className="text-2xl font-black text-white">99.9%</p>
                    <p className="text-blue-200/50 text-[9px] font-black uppercase tracking-widest mt-1">Uptime</p>
                 </div>
                 <div className="w-[1px] bg-white/10" />
                 <div className="text-center">
                    <p className="text-2xl font-black text-white">Unlimited</p>
                    <p className="text-blue-200/50 text-[9px] font-black uppercase tracking-widest mt-1">Scale</p>
                 </div>
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
