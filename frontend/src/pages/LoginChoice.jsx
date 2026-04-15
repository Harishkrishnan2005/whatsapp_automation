import { useNavigate } from 'react-router-dom';
import { FiBriefcase, FiMessageCircle, FiShield } from 'react-icons/fi';

const LoginChoice = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-12">
        <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-2xl backdrop-blur-xl">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">Multi-role portal</p>
            <h1 className="mt-6 text-5xl font-bold text-white">WhatsApp Automation</h1>
            <p className="mt-4 text-sm leading-7 text-slate-300">Choose the right portal for your role and enjoy the new multi-tenant interface with modern cards, clean navigation, and full UX consistency.</p>
            <div className="mt-10 rounded-[1.75rem] border border-white/10 bg-slate-900/50 p-6">
              <p className="text-sm font-semibold text-white">Portal benefits</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li>• Clear dashboard analytics</li>
                <li>• Smooth staff chat management</li>
                <li>• Unified admin controls</li>
                <li>• Platform oversight (Super Admin)</li>
              </ul>
            </div>
          </div>

          <div className="grid gap-6">
            <div
              onClick={() => navigate('/login/superadmin')}
              className="cursor-pointer rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl transition hover:-translate-y-1 hover:border-violet-400/20"
            >
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-violet-500/10 text-violet-300 shadow-sm">
                <FiShield className="h-6 w-6" />
              </div>
              <h2 className="mt-6 text-3xl font-semibold text-white">Super Admin Portal</h2>
              <p className="mt-3 text-slate-400">Platform-wide oversight, business management, and subscription monitoring.</p>
              <div className="mt-8 inline-flex items-center rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15">
                Login as Super Admin
              </div>
            </div>

            <div
              onClick={() => navigate('/login/admin')}
              className="cursor-pointer rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl transition hover:-translate-y-1 hover:border-cyan-400/20"
            >
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-cyan-500/10 text-cyan-300 shadow-sm">
                <FiBriefcase className="h-6 w-6" />
              </div>
              <h2 className="mt-6 text-3xl font-semibold text-white">Admin Portal</h2>
              <p className="mt-3 text-slate-400">Full access to customers, orders, campaigns, analytics, and staff controls.</p>
              <div className="mt-8 inline-flex items-center rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15">
                Login as Admin
              </div>
            </div>

            <div
              onClick={() => navigate('/login/staff')}
              className="cursor-pointer rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl transition hover:-translate-y-1 hover:border-emerald-400/20"
            >
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-300 shadow-sm">
                <FiMessageCircle className="h-6 w-6" />
              </div>
              <h2 className="mt-6 text-3xl font-semibold text-white">Staff Portal</h2>
              <p className="mt-3 text-slate-400">Manage chats, bookings, notes, and assigned tasks with a smooth staff dashboard.</p>
              <div className="mt-8 inline-flex items-center rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15">
                Login as Staff
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginChoice;
