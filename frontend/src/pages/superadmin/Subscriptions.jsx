import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiCreditCard, FiTrendingUp, FiCheckCircle, FiActivity, FiLayers } from 'react-icons/fi';
import api from '../../utils/api';

const Subscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const response = await api.get('/superadmin/subscriptions');
        setSubscriptions(response.data.subscriptions || []);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Unable to load subscriptions');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 opacity-30 select-none">
         <div className="h-10 w-10 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-4" />
         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Financial Matrix...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 rounded-[2.5rem] bg-rose-50 border border-rose-100 text-[10px] font-black uppercase tracking-widest text-rose-600">
        Sync Failure: {error}
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Subscription Intelligence</h1>
          <p className="mt-2 text-slate-500 font-medium tracking-tight">Monitoring financial distribution and plan penetration across the ecosystem.</p>
        </div>
        <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status</p>
           <p className="text-sm font-bold text-slate-900 mt-1 uppercase leading-none">Revenue Live</p>
        </div>
      </header>

      <section className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {subscriptions.map((sub, i) => (
          <motion.div 
            key={sub.plan}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group relative bg-white rounded-[2.5rem] border border-slate-200/60 p-10 hover:shadow-2xl hover:shadow-slate-200/40 transition-all duration-500 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50 rounded-full -mr-24 -mt-24 opacity-30 blur-3xl group-hover:bg-emerald-50 transition-colors" />
            
            <div className="flex items-center justify-between mb-10">
               <div className="h-14 w-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xl shadow-slate-900/10 group-hover:scale-110 transition-transform duration-500">
                  <FiCreditCard className="h-7 w-7" />
               </div>
               <div className="flex flex-col items-end">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] leading-none">Plan Segment</p>
                  <p className="text-sm font-black text-slate-900 mt-2 uppercase tracking-tight">{sub.plan}</p>
               </div>
            </div>

            <div className="space-y-2">
               <p className="text-5xl font-black text-slate-900 tracking-tighter group-hover:text-blue-600 transition-colors">{sub.businessCount}</p>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <FiLayers className="h-3 w-3" />
                  Active Infrastructure Nodes
               </p>
            </div>

            <div className="mt-10 pt-8 border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400 font-black text-[9px] uppercase tracking-widest">
                 <FiActivity className="h-3 w-3" />
                 Last Updated: {new Date(sub.lastUpdated).toLocaleDateString()}
              </div>
              <FiCheckCircle className="text-emerald-500 h-5 w-5" />
            </div>
            
            <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-600/5 rounded-[2.5rem] transition-all pointer-events-none" />
          </motion.div>
        ))}
      </section>

      {subscriptions.length === 0 && (
        <div className="py-32 bg-white rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center justify-center grayscale opacity-30 select-none">
           <FiTrendingUp className="h-20 w-20 mb-6 text-slate-300" />
           <p className="font-black text-lg uppercase tracking-[0.4em] text-slate-400">Ledger Empty</p>
        </div>
      )}
    </div>
  );
};

export default Subscriptions;