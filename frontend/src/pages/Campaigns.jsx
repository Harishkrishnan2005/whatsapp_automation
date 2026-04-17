import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiEdit3, FiShoppingCart, FiCalendar, FiClock, FiSend, FiUsers } from 'react-icons/fi';
import api from '../utils/api';
import CreateProductCampaignModal from '../components/CreateProductCampaignModal';
import useAnalyticsStore from '../store/analyticsStore';
import { getDateRangePayload } from '../utils/dateRange';
import Badge from '../components/ui/Badge';

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [clientPage, setClientPage] = useState(1);
  const clientLimit = 5;
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');
  const [type, setType] = useState('TEXT');
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [showProductCampaignModal, setShowProductCampaignModal] = useState(false);
  
  const dateRange = useAnalyticsStore((state) => state.dateRange);
  const searchQuery = useAnalyticsStore((state) => state.searchQuery);

  const fetchCampaigns = async () => {
    try {
      const { from, to } = getDateRangePayload(dateRange);
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (searchQuery) params.set('search', searchQuery);
      const response = await api.get(`/campaigns${params.toString() ? `?${params.toString()}` : ''}`);
      setCampaigns(response.data || []);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    const interval = setInterval(fetchCampaigns, 10000);
    return () => clearInterval(interval);
  }, [dateRange, searchQuery]);

  const createCampaign = async () => {
    if (!message.trim()) return;
    setSaving(true);
    try {
      await api.post('/campaigns', { 
        message, audience, type, 
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined 
      });
      setMessage('');
      setScheduledAt('');
      await fetchCampaigns();
    } catch (error) {
      console.error('Failed to send campaign:', error);
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'completed') return <Badge variant="delivered">Completed</Badge>;
    if (s === 'processing') return <Badge variant="processed">Processing</Badge>;
    if (s === 'scheduled') return <Badge variant="pending">Scheduled</Badge>;
    if (s === 'failed') return <Badge variant="cancelled">Failed</Badge>;
    return <Badge variant="pending">{status || 'Pending'}</Badge>;
  };

  const clientTotalPages = Math.max(1, Math.ceil(campaigns.length / clientLimit));
  const visibleCampaigns = campaigns.slice((clientPage - 1) * clientLimit, clientPage * clientLimit);

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Broadcast Network</h1>
          <p className="mt-2 text-slate-500 font-medium tracking-tight">Managing large-scale audience distribution protocols.</p>
        </div>
        <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
           <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status</p>
           <p className="text-sm font-bold text-slate-900 mt-1 uppercase">Transmission Ready</p>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-12">
        {/* Composition Terminal */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="saas-card p-10">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-8">
               Broadcast Node
               <span className="h-2 w-2 rounded-full bg-blue-600 block mt-1" />
            </h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">Message Payload</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Initiate communication protocol..."
                  className="w-full rounded-2xl border-slate-200 bg-slate-50 p-5 text-sm font-medium text-slate-700 placeholder:text-slate-400 transition-all outline-none resize-none leading-relaxed"
                  rows="5"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">Target Segment</label>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black uppercase text-slate-600 outline-none focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="all">Full Global Network</option>
                    <option value="existing">Converted Data Nodes</option>
                    <option value="new">External Inbound Leads</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">Transmission Mode</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black uppercase text-slate-600 outline-none focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="TEXT">Native Protocol</option>
                    <option value="TEMPLATE">Cloud Logic Template</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">Release Schedule</label>
                <div className="relative">
                  <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full rounded-xl border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-[11px] font-black text-slate-600 outline-none focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                onClick={createCampaign}
                disabled={saving || !message}
                className="btn-primary w-full py-5 text-[10px] font-black uppercase tracking-widest shadow-none h-auto"
              >
                {saving ? 'Syncing...' : scheduledAt ? 'Schedule Distribution' : 'Initiate Broadcast'}
                <FiSend className="ml-2 h-4 w-4" />
              </button>
            </div>
          </div>

          <button 
            onClick={() => setShowProductCampaignModal(true)}
            className="w-full p-10 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex items-center justify-between group hover:bg-slate-900 hover:border-slate-900 transition-all duration-500"
          >
            <div className="text-left">
              <h4 className="font-black text-slate-900 group-hover:text-white transition-colors uppercase tracking-tight text-lg">Product Matrix</h4>
              <p className="text-[10px] font-black text-slate-400 group-hover:text-slate-300 transition-colors uppercase tracking-widest mt-1">Disseminate Inventory Catalog</p>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center text-slate-900 shadow-xl shadow-slate-900/5 group-hover:scale-110 transition-transform">
              <FiShoppingCart className="h-6 w-6" />
            </div>
          </button>
        </aside>

        {/* Global Distribution Ledger */}
        <main className="lg:col-span-8">
          <div className="saas-card min-h-[750px] flex flex-col">
            <header className="px-10 py-8 border-b border-slate-50 bg-slate-50/20 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Transmission History</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Audit Trail • {campaigns.length} Executed Nodes</p>
              </div>
            </header>

            {campaigns.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center opacity-20 select-none">
                <FiClock className="h-24 w-24 mb-6 text-slate-300" />
                <p className="font-black text-lg uppercase tracking-[0.2em] text-slate-400">Ledger Empty</p>
              </div>
            ) : (
              <div className="flex-1 space-y-4 p-8 overflow-y-auto custom-scrollbar">
                {visibleCampaigns.map((c) => (
                  <motion.article 
                    key={c._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group relative p-8 rounded-[2rem] border border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/50 hover:shadow-2xl hover:shadow-slate-200/40 transition-all duration-500"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start gap-5">
                           <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-sm">
                             <FiEdit3 className="h-6 w-6" />
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-base font-bold text-slate-900 line-clamp-2 leading-relaxed tracking-tight">{c.message}</p>
                              <div className="flex items-center gap-4 mt-3">
                                 {getStatusBadge(c.status)}
                                 <div className="h-1 w-1 rounded-full bg-slate-300" />
                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100/50">
                                    <FiUsers className="h-3 w-3" /> {c.audience} SEGMENT
                                 </span>
                              </div>
                           </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-10 md:pl-10 md:border-l border-slate-100">
                         <div className="text-center">
                            <p className="text-2xl font-black text-slate-900 tracking-tighter">{c.totalCustomers}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Population</p>
                         </div>
                         <div className="text-center">
                            <p className="text-2xl font-black text-blue-600 tracking-tighter">{c.sentCount}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Confirmed</p>
                         </div>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            )}

            {campaigns.length > clientLimit && (
              <div className="mt-auto px-10 py-8 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Viewing Index {clientPage} of {clientTotalPages}</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setClientPage(p => Math.max(1, p - 1))}
                    disabled={clientPage === 1}
                    className="h-12 px-6 rounded-2xl bg-white border border-slate-200 text-[10px] font-black uppercase text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"
                  >
                    Previous Node
                  </button>
                  <button
                    onClick={() => setClientPage(p => Math.min(clientTotalPages, p + 1))}
                    disabled={clientPage >= clientTotalPages}
                    className="h-12 px-8 rounded-2xl bg-blue-600 text-[10px] font-black uppercase text-white disabled:opacity-30 hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
                  >
                    Next Frame
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <CreateProductCampaignModal
        isOpen={showProductCampaignModal}
        onClose={() => setShowProductCampaignModal(false)}
        onCampaignCreated={fetchCampaigns}
      />
    </div>
  );
};

export default Campaigns;
