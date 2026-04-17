import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiBriefcase, FiMessageSquare, FiShield, FiArrowRight } from 'react-icons/fi';

const LoginChoice = () => {
  const navigate = useNavigate();

  const choices = [
    {
      title: 'Merchant Portal',
      desc: 'Full control over customers, campaigns, bookings, and business growth matrix.',
      icon: FiBriefcase,
      path: '/login/admin',
      col: 'blue',
      tag: 'ADMINISTRATIVE'
    },
    {
      title: 'Specialist Workspace',
      desc: 'Dedicated environment for staff to manage chats and deliver services.',
      icon: FiMessageSquare,
      path: '/login/staff',
      col: 'emerald',
      tag: 'OPERATIONAL'
    },
    {
      title: 'Infrastructure Hub',
      desc: 'Global monitoring, tenant management, and platform infrastructure oversight.',
      icon: FiShield,
      path: '/login/superadmin',
      col: 'indigo',
      tag: 'ROOT ACCESS'
    }
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 lg:p-10 selection:bg-blue-100">
      <div className="w-full max-w-[1280px] flex flex-col gap-12 lg:gap-20">
        <header className="text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-blue-600 text-white shadow-2xl shadow-blue-500/30 mb-4"
          >
            <FiShield className="h-6 w-6" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 leading-none">Ematix<span className="text-blue-600">.</span></h1>
          <p className="mt-4 text-slate-500 font-medium max-w-lg mx-auto leading-relaxed text-sm tracking-tight px-4">Select your specialized entry point to synchronize with the global enterprise automation layer.</p>
        </header>

        <main className="grid gap-8 md:grid-cols-3">
          {choices.map((choice, i) => (
            <motion.div
              key={i}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => navigate(choice.path)}
              className="group cursor-pointer relative rounded-[2.5rem] bg-white border border-slate-200/60 p-8 transition-all hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] hover:-translate-y-2"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-${choice.col}-50 text-${choice.col}-600 group-hover:bg-${choice.col}-600 group-hover:text-white transition-all duration-500 shadow-sm shadow-${choice.col}-900/5`}>
                  <choice.icon className="h-6 w-6" />
                </div>
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">{choice.tag}</span>
              </div>

              <h2 className="text-2xl font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                {choice.title}
              </h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-slate-500 group-hover:text-slate-600 transition-colors">
                {choice.desc}
              </p>

              <div className="mt-12 flex items-center justify-between">
                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-600 transition-all">
                  Initialize Session <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                </div>
                <div className={`h-2 w-2 rounded-full bg-${choice.col}-500 group-hover:animate-ping`} />
              </div>

              <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-600/5 rounded-[3rem] transition-all" />
            </motion.div>
          ))}
        </main>

        <footer className="text-center">
          <div className="inline-flex items-center gap-4 px-6 py-3 rounded-2xl bg-white border border-slate-200/60 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">Core Engine v1.0.0</span>
            <div className="h-4 w-[1px] bg-slate-100" />
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-black text-slate-900 tracking-widest uppercase">Nodes Operational</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LoginChoice;
