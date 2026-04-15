import { useEffect, useState } from 'react';
import api from '../../utils/api';

const Subscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const response = await api.get('/superadmin/subscriptions');
        setSubscriptions(response.data.subscriptions);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Unable to load subscriptions');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  if (loading) {
    return <div className="p-8 text-white">Loading subscriptions...</div>;
  }

  if (error) {
    return <div className="p-8 text-white">{error}</div>;
  }

  return (
    <div className="space-y-6 p-8 text-slate-100">
      <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-8 shadow-xl">
        <h1 className="text-3xl font-semibold text-white">Subscriptions</h1>
        <p className="mt-3 text-sm text-slate-400">Monitor subscription plans and business distribution.</p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-xl">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {subscriptions.map((sub) => (
            <div key={sub.plan} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
              <h3 className="text-xl font-semibold text-white">{sub.plan}</h3>
              <p className="mt-2 text-3xl font-bold text-slate-300">{sub.businessCount}</p>
              <p className="mt-1 text-sm text-slate-400">businesses</p>
              <p className="mt-4 text-xs text-slate-500">
                Last updated: {new Date(sub.lastUpdated).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Subscriptions;