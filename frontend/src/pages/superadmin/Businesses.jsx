import { useEffect, useState } from 'react';
import api from '../../utils/api';

const Businesses = () => {
  const [businesses, setBusinesses] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const response = await api.get('/superadmin/businesses');
        setBusinesses(response.data.businesses);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Unable to load businesses');
      } finally {
        setLoading(false);
      }
    };

    fetchBusinesses();
  }, []);

  if (loading) {
    return <div className="p-8 text-white">Loading businesses...</div>;
  }

  if (error) {
    return <div className="p-8 text-white">{error}</div>;
  }

  return (
    <div className="space-y-6 p-8 text-slate-100">
      <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-8 shadow-xl">
        <h1 className="text-3xl font-semibold text-white">Businesses</h1>
        <p className="mt-3 text-sm text-slate-400">Review all registered businesses and their details.</p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-xl">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {businesses.map((business) => (
            <div key={business._id} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
              <h3 className="text-xl font-semibold text-white">{business.name}</h3>
              <p className="mt-2 text-sm text-slate-400">{business.email}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{business.plan}</span>
                <span className="text-xs text-slate-500">{business.businessType}</span>
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Created: {new Date(business.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Businesses;