import { useEffect, useState } from 'react';
import { FiSend, FiTarget, FiTrendingUp } from 'react-icons/fi';
import api from '../../utils/api';

const StaffCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    api.get('/staff/campaigns')
      .then((response) => setCampaigns(Array.isArray(response.data) ? response.data : response.data?.campaigns || []))
      .catch((error) => console.error('Failed to load campaigns', error));
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-black text-slate-900">Campaign Workspace</h1>
        <p className="mt-2 text-slate-500">Assigned marketing staff can review campaign performance here.</p>
      </header>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-[2rem] border border-slate-200/60 bg-white p-6 shadow-sm">
          <FiSend className="h-6 w-6 text-blue-600" />
          <p className="mt-4 text-3xl font-black text-slate-900">{campaigns.length}</p>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Campaigns</p>
        </div>
        <div className="rounded-[2rem] border border-slate-200/60 bg-white p-6 shadow-sm">
          <FiTarget className="h-6 w-6 text-emerald-600" />
          <p className="mt-4 text-3xl font-black text-slate-900">{campaigns.filter((item) => item.status === 'ACTIVE').length}</p>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Active</p>
        </div>
        <div className="rounded-[2rem] border border-slate-200/60 bg-white p-6 shadow-sm">
          <FiTrendingUp className="h-6 w-6 text-indigo-600" />
          <p className="mt-4 text-3xl font-black text-slate-900">{campaigns.filter((item) => item.status !== 'ACTIVE').length}</p>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Completed</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white shadow-sm">
        <div className="grid grid-cols-[1.3fr_0.7fr_0.7fr] border-b border-slate-100 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <span>Name</span>
          <span>Status</span>
          <span>Audience</span>
        </div>
        {campaigns.map((campaign) => (
          <div key={campaign._id} className="grid grid-cols-[1.3fr_0.7fr_0.7fr] px-6 py-4 text-sm text-slate-700">
            <span className="font-bold">{campaign.name || campaign.title || 'Campaign'}</span>
            <span>{campaign.status || 'DRAFT'}</span>
            <span>{campaign.audience || campaign.segment || 'All Customers'}</span>
          </div>
        ))}
        {campaigns.length === 0 && (
          <div className="px-6 py-16 text-center text-sm font-bold text-slate-400">No campaigns available for this business yet.</div>
        )}
      </div>
    </div>
  );
};

export default StaffCampaigns;
