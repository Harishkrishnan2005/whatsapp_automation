import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiShield, FiArrowRight, FiCheckCircle } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const SuperAdminLogin = () => {
  const [email, setEmail] = useState('superadmin@system.com');
  const [password, setPassword] = useState('superadmin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, 'super_admin');
      navigate('/superadmin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] p-6 lg:p-12">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex w-full max-w-[1100px] overflow-hidden rounded-[2.5rem] bg-white shadow-[0_20px_100px_rgba(0,0,0,0.1)] border border-slate-100"
      >
        {/* Left Section: Branding */}
        <div className="hidden w-[40%] bg-slate-900 p-10 md:flex md:flex-col md:justify-between lg:p-14 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full -mr-40 -mt-20 blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full -ml-40 -mb-20 blur-[100px]" />
          
          <div className="relative z-10 space-y-8">
            <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white">
               <FiShield className="h-7 w-7" />
            </div>
            <h2 className="text-6xl font-black leading-none text-white tracking-tighter">
              Enterprise <br/>
              <span className="text-blue-500">Core</span> <br/>
              Control
            </h2>
            <p className="text-xl text-slate-400 font-medium max-w-sm">The administrative backbone of the entire multi-tenant automation ecosystem.</p>
          </div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="relative z-10 rounded-[2.5rem] bg-white/5 p-10 backdrop-blur-2xl border border-white/5"
          >
            <p className="text-sm font-black text-blue-500 uppercase tracking-widest mb-4">System Ledger</p>
            <p className="text-xl italic text-slate-200 leading-relaxed font-medium">
              "Governing global node distribution and infrastructure stability with zero-latency precision."
            </p>
            <div className="mt-8 pt-8 border-t border-white/10">
              <p className="font-black text-white uppercase tracking-tight">Core Infrastructure</p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Global Admin Protocol</p>
            </div>
          </motion.div>
        </div>

        {/* Right Section: Form */}
        <div className="flex w-full flex-col p-8 md:w-[60%] lg:p-14 justify-center">
          <header className="mb-6">
            <div className="flex items-center gap-3 mb-6">
               <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <FiShield className="h-4 w-4" />
               </div>
               <span className="text-xl font-black tracking-tight text-slate-900 uppercase">Ematix Core</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Administrative Access</h1>
            <p className="mt-4 text-slate-500 font-medium">Please enter your secondary-level authorization credentials to proceed.</p>
          </header>

          <main>
            {error && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mb-8 rounded-2xl border border-rose-100 bg-rose-50 p-4 flex items-center gap-3 text-sm text-rose-600 font-bold uppercase tracking-widest">
                 <span className="h-2 w-2 rounded-full bg-rose-600" /> {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Admin Identity (Email)</label>
                <input 
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-2xl border-slate-200 bg-slate-50/50 px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all"
                  placeholder="admin@system.core" required disabled={loading}
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end px-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Protocol Key</label>
                   <button type="button" className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline">Request Reset</button>
                </div>
                <input 
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-2xl border-slate-200 bg-slate-50/50 px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all"
                  placeholder="••••••••••••" required disabled={loading}
                />
              </div>

              <button 
                type="submit" disabled={loading}
                className="btn-primary w-full py-5 rounded-2xl shadow-xl shadow-blue-500/20 text-xs font-black uppercase tracking-[0.2em] relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                   {loading ? 'Authenticating Matrix...' : 'Establish Secure Connection'}
                   {!loading && <FiArrowRight className="group-hover:translate-x-1 transition-transform" />}
                </span>
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </button>
            </form>
          </main>

          <footer className="mt-10 pt-6 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
             <button onClick={() => navigate('/admin/login')} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><FiCheckCircle className="h-3 w-3" /></div>
                Return to Merchant Core
             </button>
             <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">V4.2.0 STABLE BUILD</p>
          </footer>
        </div>
      </motion.div>
    </div>
  );
};

export default SuperAdminLogin;
