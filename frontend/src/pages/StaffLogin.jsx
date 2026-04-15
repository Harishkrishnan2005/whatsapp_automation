import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMessageCircle } from 'react-icons/fi';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950/90 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/15 text-emerald-300 shadow-lg">
            <FiMessageCircle className="h-7 w-7" />
          </div>
          <h1 className="text-4xl font-semibold">Staff Login</h1>
          <p className="mt-3 text-sm text-slate-300">Sign in to the staff portal and manage your daily workflow.</p>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">
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
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20"
              placeholder="staff@example.com"
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
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20"
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
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-8 rounded-3xl border border-white/10 bg-slate-900/40 p-5 text-center text-sm text-slate-300">
          <p>Staff can track chats, bookings, orders and notes with the updated portal UI.</p>
        </div>

        <div className="mt-6 text-center text-sm text-slate-400">
          <p>
            Are you an admin?{' '}
            <button
              type="button"
              onClick={() => navigate('/login/admin')}
              className="font-semibold text-emerald-300 hover:text-emerald-200"
            >
              Switch to Admin Login
            </button>
          </p>
          <p className="mt-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="font-semibold text-emerald-300 hover:text-emerald-200"
            >
              Back to selection
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;
