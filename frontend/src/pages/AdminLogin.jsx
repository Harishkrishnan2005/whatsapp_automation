import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBriefcase } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const AdminLogin = () => {
  const [email, setEmail] = useState('admin@test.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password, 'admin');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950/90 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-500/15 text-cyan-300 shadow-lg">
            <FiBriefcase className="h-7 w-7" />
          </div>
          <h1 className="text-4xl font-semibold">Admin Login</h1>
          <p className="mt-3 text-sm text-slate-300">Access the admin portal with the new unified UI.</p>
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
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
              placeholder="admin@example.com"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
              placeholder="********"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center disabled:opacity-60"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-8 rounded-3xl border border-white/10 bg-slate-900/40 p-5 text-center text-sm text-slate-300">
          <p>Use the admin portal to manage the full business flow.</p>
          <p className="mt-3 font-mono text-xs text-slate-400">admin@test.com / admin123</p>
        </div>

        <div className="mt-6 text-center text-sm text-slate-400">
          <p>
            Not an admin?{' '}
            <button
              type="button"
              onClick={() => navigate('/login/staff')}
              className="font-semibold text-cyan-300 hover:text-cyan-200"
            >
              Switch to Staff Login
            </button>
          </p>
          <p className="mt-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="font-semibold text-cyan-300 hover:text-cyan-200"
            >
              Back to selection
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
