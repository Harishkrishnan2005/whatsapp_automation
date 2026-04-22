import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiBriefcase, FiMail, FiCalendar, FiBox, FiUsers, FiZap, FiActivity, FiCheckCircle } from 'react-icons/fi';
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
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none uppercase italic">Enterprise Ecosystem</h1>
          <p className="mt-2 text-slate-500 font-medium tracking-tight">Monitoring all registered business nodes and tenant specifications.</p>
        </div>
        <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Resource Count</p>
           <p className="text-sm font-bold text-slate-900 mt-1 uppercase leading-none">{businesses.length} Active Tenants</p>
        </div>
      </header>

      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {businesses.map((business, i) => (
          <motion.div 
            key={business._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group relative bg-white rounded-[3rem] border border-slate-200/60 p-10 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500"
          >
            <div className="flex items-center justify-between mb-8">
               <div className="h-16 w-16 rounded-[1.5rem] bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-500/20 group-hover:scale-110 transition-transform duration-500">
                  <FiBriefcase className="h-8 w-8" />
               </div>
               <div className={`h-3 w-3 rounded-full ring-4 ring-white shadow-sm ${business.isActive !== false ? 'bg-emerald-500 animate-pulse ring-emerald-500/10' : 'bg-slate-300'}`} />
            </div>

            <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase group-hover:text-blue-600 transition-colors leading-none truncate">{business.name}</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">{business.businessType || 'Standard Tenant'}</p>
            
            <div className="mt-8 space-y-4">
               <div className="flex items-center gap-3 text-slate-500">
                  <FiMail className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-bold truncate">{business.email}</span>
               </div>
               
               <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
                  <div className="space-y-1">
                     <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                        <FiUsers className="h-3 w-3 text-blue-500" />
                        Staff Nodes
                     </div>
                     <p className="text-lg font-black text-slate-900">{business.staffCount || 0}</p>
                  </div>
                  <div className="space-y-1">
                     <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                        <FiZap className="h-3 w-3 text-emerald-500" />
                        Active Flows
                     </div>
                     <p className="text-lg font-black text-slate-900">{business.flowCount || 0}</p>
                  </div>
               </div>

               <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                     <div className="flex items-center gap-2 text-slate-400">
                        <FiActivity className="h-3 w-3 text-indigo-500" />
                        Messaging Throughput
                     </div>
                     <span className="text-blue-600">{business.messagesUsed} / {business.maxMessages === Infinity ? '∞' : business.maxMessages}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                     <div 
                        className="h-full bg-blue-600 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                        style={{ width: `${Math.min(100, (business.messagesUsed / (business.maxMessages || 1)) * 100)}%` }}
                     />
                  </div>
               </div>

               <div className="pt-4 flex items-center gap-3 text-slate-400 font-extrabold text-[9px] uppercase tracking-widest leading-tight border-t border-slate-50">
                  <FiCalendar className="h-3.5 w-3.5 text-slate-300" />
                  <div className="flex flex-col">
                    <span>Provisioned: {new Date(business.createdAt).toLocaleDateString()}</span>
                    <span className="text-rose-500 mt-0.5">
                      Service Expiry: {business.subscription?.expiryDate 
                        ? new Date(business.subscription.expiryDate).toLocaleDateString() 
                        : new Date(new Date(business.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </span>
                  </div>
               </div>
            </div>

            <div className="mt-10 flex items-center justify-between">
              <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-xl shadow-lg shadow-slate-900/10 transition-transform hover:scale-105 cursor-default">
                 <FiBox className="h-4 w-4 text-blue-400" />
                 <span className="text-[10px] font-black text-white uppercase tracking-widest">{business.subscription?.plan || 'Free Tier'}</span>
              </div>
              <div className="h-8 w-8 rounded-full border-2 border-slate-100 flex items-center justify-center text-slate-200 group-hover:text-emerald-500 group-hover:border-emerald-100 transition-all">
                <FiCheckCircle className="h-4 w-4" />
              </div>
            </div>
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