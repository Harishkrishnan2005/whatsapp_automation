import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMessageSquare, FiArrowRight, FiCheckCircle } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const StaffLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, 'staff');
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
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
          <header className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/20">
              <FiMessageSquare className="h-5 w-5" />
            </div>
            <span className="text-xl font-extrabold tracking-tighter text-slate-900 uppercase">Ematix<span className="text-blue-600">.</span></span>
          </header>

          <main className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
            <div className="mb-8">
               <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
                 Specialist Node Login
               </h1>
               <p className="mt-3 text-slate-500 font-medium">
                 Access your operational workspace and engage with real-time customer data.
               </p>
            </div>

            {error && <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-xs font-bold text-rose-700">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Professional Identifier (Email)</label>
                <input 
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-2xl border-slate-200 bg-slate-50/50 p-4 text-sm font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  placeholder="specialist@team.com" required disabled={loading}
                />
              </div>

              <div>
                <div className="flex justify-between items-center px-1">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Authentication Token (Password)</label>
                   <button type="button" className="text-[10px] font-black uppercase text-blue-600 tracking-tighter hover:underline">Verify key?</button>
                </div>
                <input 
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-2xl border-slate-200 bg-slate-50/50 p-4 text-sm font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  placeholder="••••••••" required disabled={loading}
                />
              </div>

              <button 
                type="submit" disabled={loading}
                className="btn-primary w-full py-5 rounded-[1.5rem] mt-4 shadow-xl shadow-blue-500/10"
              >
                {loading ? 'Authenticating...' : 'Enter Workspace'}
                {!loading && <FiArrowRight className="inline ml-2" />}
              </button>
            </form>
          </main>

          <footer className="mt-8 pt-6 border-t border-slate-50">
             <button onClick={() => navigate('/admin/login')} className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 hover:text-blue-600 flex items-center gap-2">
                <FiCheckCircle className="text-blue-500" /> Switch to Administrative Infrastructure
             </button>
          </footer>
        </div>

        {/* Right Section: Aesthetic Visualization */}
        <div className="hidden w-[45%] bg-[#1e40af] p-10 md:flex md:flex-col md:justify-between relative overflow-hidden">
           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-400/20 rounded-full -mr-40 -mt-40 blur-[120px]" />
           <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-700/30 rounded-full -ml-40 -mb-40 blur-[120px]" />
           
           <div className="relative z-10">
              <h2 className="text-6xl font-black text-white leading-[1.05] tracking-tighter">
                Accelerate <br/> Team <br/> 
                <span className="opacity-40 italic">Velocity.</span>
              </h2>
           </div>

           <div className="relative z-10">
              <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl">
                 <p className="text-blue-200 text-xs font-black uppercase tracking-[0.3em] mb-4">Operative Insight</p>
                 <p className="text-xl font-medium text-white leading-relaxed italic">
                    "Managing complex multi-business dialogs is now a unified experience with zero latency."
                 </p>
                 <div className="mt-8 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-blue-500 shadow-xl border-2 border-white/10" />
                    <div>
                       <p className="text-white text-sm font-black">Alex R.</p>
                       <p className="text-blue-200/60 text-[10px] font-bold">Logistics Coordinator</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

export default StaffLogin;
