import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiShield } from 'react-icons/fi';
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
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950/90 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-500/15 text-violet-300 shadow-lg">
            <FiShield className="h-7 w-7" />
          </div>
          <h1 className="text-4xl font-semibold">Super Admin Login</h1>
          <p className="mt-3 text-sm text-slate-300">Manage the platform, review businesses, and monitor global usage.</p>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20"
              placeholder="superadmin@system.com"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20"
              placeholder="********"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Login as Super Admin'}
          </button>
        </form>

        <div className="mt-8 rounded-3xl border border-white/10 bg-slate-900/40 p-5 text-center text-sm text-slate-300">
          <p>Use the super admin portal to review tenant performance and manage subscriptions.</p>
        </div>

        <div className="mt-6 text-center text-sm text-slate-400">
          <button
            type="button"
            onClick={() => navigate('/admin/login')}
            className="font-semibold text-violet-300 hover:text-violet-200"
          >
            Go to Admin Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
