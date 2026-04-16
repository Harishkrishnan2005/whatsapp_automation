import { useEffect, useState } from 'react';
import { FiEdit3, FiShoppingBag } from 'react-icons/fi';
import api from '../utils/api';
import CreateProductCampaignModal from '../components/CreateProductCampaignModal';
import useAnalyticsStore from '../store/analyticsStore';
import { getDateRangePayload } from '../utils/dateRange';

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [clientPage, setClientPage] = useState(1);
  const clientLimit = 3;
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');
  const [saving, setSaving] = useState(false);
  const [showProductCampaignModal, setShowProductCampaignModal] = useState(false);
  const dateRange = useAnalyticsStore((state) => state.dateRange);
  const searchQuery = useAnalyticsStore((state) => state.searchQuery);

  useEffect(() => {
    fetchCampaigns();
  }, [dateRange, searchQuery]);

  const fetchCampaigns = async () => {
    try {
      const { from, to } = getDateRangePayload(dateRange);
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (searchQuery) params.set('search', searchQuery);

      const response = await api.get(`/campaigns${params.toString() ? `?${params.toString()}` : ''}`);
      setCampaigns(response.data);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    }
  };

  const createCampaign = async () => {
    if (!message.trim()) return;
    setSaving(true);
    try {
      await api.post('/campaigns', { message, audience });
      setMessage('');
      setAudience('all');
      await fetchCampaigns();
    } catch (error) {
      console.error('Failed to send campaign:', error);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    setClientPage(1);
  }, [campaigns.length]);

  useEffect(() => {
    setClientPage(1);
  }, [dateRange, searchQuery]);

  const clientTotalPages = Math.max(1, Math.ceil(campaigns.length / clientLimit));
  const visibleCampaigns = campaigns.slice((clientPage - 1) * clientLimit, clientPage * clientLimit);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Campaigns</h1>
        <p className="text-white/60">Create campaigns, review delivery analytics, and monitor conversions.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <section className="lg:col-span-1 rounded-2xl backdrop-blur-md border border-white/20 shadow-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Create Campaign</h2>

          <div className="mb-6">
            <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-white/70">
              <FiEdit3 className="h-4 w-4" />
              Text Campaign
            </h3>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Campaign message"
              className="w-full px-4 py-3 border border-white/20 rounded-xl bg-white/10 text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
              rows="3"
            />
            <div className="mt-4">
              <label className="text-sm font-medium text-white/70">Audience</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="mt-2 w-full border border-white/20 rounded-xl px-4 py-2 bg-white/10 text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
              >
                <option value="all" className="bg-white text-slate-900">All Customers</option>
                <option value="existing" className="bg-white text-slate-900">Existing Customers</option>
              </select>
            </div>
            <button
              onClick={createCampaign}
              disabled={saving}
              className="mt-4 w-full bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/30 text-blue-200 px-4 py-2 rounded-xl font-semibold transition disabled:opacity-50"
            >
              {saving ? 'Sending...' : 'Send Text Campaign'}
            </button>
          </div>

          <div className="border-t border-white/10 my-6" />

          <div>
            <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-white/70">
              <FiShoppingBag className="h-4 w-4" />
              Product Campaign
            </h3>
            <p className="text-xs text-white/60 mb-4">
              Send a carousel of products to your customers with pricing and discounts.
            </p>
            <button
              onClick={() => setShowProductCampaignModal(true)}
              className="w-full bg-gradient-to-r from-green-600/40 to-emerald-600/40 hover:from-green-600/60 hover:to-emerald-600/60 border border-green-400/30 text-green-200 px-4 py-2 rounded-xl font-semibold transition"
            >
              Create Product Campaign
            </button>
          </div>
        </section>

        <section className="lg:col-span-2 rounded-2xl backdrop-blur-md border border-white/20 shadow-xl p-6">
          <div className="flex items-start justify-between mb-6 gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Campaign Performance</h2>
              <p className="text-white/60 text-sm mt-1">Track delivery and conversion metrics for each campaign.</p>
            </div>
          </div>
          {campaigns.length === 0 ? (
            <div className="py-12 text-center text-white/50">No campaigns sent yet.</div>
          ) : (
            <div className="space-y-4">
              {visibleCampaigns.map((campaign) => (
                <div key={campaign._id} className="border border-white/10 rounded-2xl p-4 bg-white/5 hover:bg-white/10 transition">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-white">{campaign.message}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                          campaign.type === 'PRODUCT'
                            ? 'bg-green-600/30 text-green-200 border border-green-400/30'
                            : 'bg-blue-600/30 text-blue-200 border border-blue-400/30'
                        }`}>
                          {campaign.type === 'PRODUCT' ? <FiShoppingBag className="h-3.5 w-3.5" /> : <FiEdit3 className="h-3.5 w-3.5" />}
                          {campaign.type === 'PRODUCT' ? 'Product' : 'Text'}
                        </span>
                      </div>
                      <p className="text-sm text-white/60 mt-2">
                        Sent to: {campaign.audience === 'existing' ? 'Existing Customers' : 'All Customers'}
                      </p>
                      <p className="text-sm text-white/60">Sent at: {new Date(campaign.sentAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <span className="px-3 py-1 rounded-full bg-blue-600/30 text-blue-200 border border-blue-400/30 text-xs font-semibold">
                        Total: {campaign.totalCustomers}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-green-600/30 text-green-200 border border-green-400/30 text-xs font-semibold">
                        Success: {campaign.successRate ?? 0}%
                      </span>
                      <span className="px-3 py-1 rounded-full bg-indigo-600/30 text-indigo-200 border border-indigo-400/30 text-xs font-semibold">
                        Conversion: {campaign.conversionRate ?? 0}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                      <p className="text-xs uppercase text-white/60">Delivered</p>
                      <p className="text-xl font-semibold text-white mt-1">{campaign.sentCount}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                      <p className="text-xs uppercase text-white/60">Converted</p>
                      <p className="text-xl font-semibold text-white mt-1">{campaign.convertedCustomers ?? 0}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                      <p className="text-xs uppercase text-white/60">Campaign ID</p>
                      <p className="text-sm text-white/70 break-all mt-1">{campaign._id}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {campaigns.length > 0 && (
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setClientPage((prev) => Math.max(1, prev - 1))}
                disabled={clientPage === 1}
                className="rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-all"
              >
                Previous
              </button>
              <button
                onClick={() => setClientPage((prev) => Math.min(clientTotalPages, prev + 1))}
                disabled={clientPage >= clientTotalPages}
                className="rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/30 px-4 py-2 text-sm font-semibold text-blue-200 disabled:opacity-50 transition-all"
              >
                Next
              </button>
            </div>
          )}
        </section>
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
