import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiBriefcase, FiMail, FiCalendar, FiBox, FiCheckCircle } from 'react-icons/fi';
import api from '../../utils/api';

const Businesses = () => {
  const [businesses, setBusinesses] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const response = await api.get('/superadmin/businesses');
        setBusinesses(response.data.businesses || []);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Unable to load businesses');
      } finally {
        setLoading(false);
      }
    };

    fetchBusinesses();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 opacity-30 select-none">
         <div className="h-10 w-10 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-4" />
         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Infrastructure...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 rounded-[2.5rem] bg-rose-50 border border-rose-100 text-[10px] font-black uppercase tracking-widest text-rose-600">
        Fatal Sync Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Enterprise Ecosystem</h1>
          <p className="mt-2 text-slate-500 font-medium tracking-tight">Monitoring all registered business nodes and tenant specifications.</p>
        </div>
        <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Resource Count</p>
           <p className="text-sm font-bold text-slate-900 mt-1 uppercase leading-none">{businesses.length} Active Tenants</p>
        </div>
      </header>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {businesses.map((business, i) => (
          <motion.div 
            key={business._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group relative bg-white rounded-[2.5rem] border border-slate-200/60 p-8 hover:shadow-2xl hover:shadow-slate-200/40 transition-all duration-500"
          >
            <div className="flex items-center justify-between mb-8">
               <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500">
                  <FiBriefcase className="h-7 w-7" />
               </div>
               <div className={`h-2.5 w-2.5 rounded-full ring-4 ring-white shadow-sm ${business.isActive !== false ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            </div>

            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase group-hover:text-blue-600 transition-colors leading-none">{business.name}</h3>
            
            <div className="mt-6 space-y-3">
               <div className="flex items-center gap-3 text-slate-500">
                  <FiMail className="h-4 w-4" />
                  <span className="text-xs font-bold truncate">{business.email}</span>
               </div>
               <div className="flex items-center gap-3 text-slate-400 font-black text-[9px] uppercase tracking-widest">
                  <FiCalendar className="h-4 w-4" />
                  <div className="flex flex-col gap-1">
                    <span>Created: {new Date(business.createdAt).toLocaleDateString()}</span>
                    <span className="text-rose-500">
                      Expires: {business.subscription?.expiryDate 
                        ? new Date(business.subscription.expiryDate).toLocaleDateString() 
                        : new Date(new Date(business.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </span>
                  </div>
               </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg shadow-sm">
                 <FiBox className="h-3 w-3 text-white" />
                 <span className="text-[9px] font-black text-white uppercase tracking-widest">{business.subscription?.plan || 'Free'}</span>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">{business.businessType}</span>
            </div>
            
            <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-600/5 rounded-[2.5rem] transition-all pointer-events-none" />
          </motion.div>
        ))}
      </div>

      {businesses.length === 0 && (
        <div className="py-32 bg-white rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center justify-center grayscale opacity-30 select-none">
           <FiBriefcase className="h-20 w-20 mb-6 text-slate-300" />
           <p className="font-black text-lg uppercase tracking-[0.4em] text-slate-400">Ecosystem Empty</p>
        </div>
      )}
    </div>
  );
};

export default Businesses;