import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950/90 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center">
          <h2 className="text-4xl font-semibold">Sign In</h2>
          <p className="mt-2 text-sm text-slate-400">Access the unified portal UI and manage your workflow.</p>
        </div>

        {error && <p className="mt-6 rounded-2xl border border-red-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</p>}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full justify-center">
            Login
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">Use admin@test.com / admin123</p>
      </div>
    </div>
  );
};

export default Login;