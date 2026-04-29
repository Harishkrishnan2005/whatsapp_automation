import { useEffect, useState } from 'react';
import { FiMessageCircle, FiPlus, FiTerminal, FiActivity, FiZap, FiInfo } from 'react-icons/fi';
import api from '../../utils/api';

const initialForm = {
  triggerKeywords: '',
  responseTemplate: '',
  step: 'start',
  nextStep: '',
  action: 'NONE',
  isActive: true,
};

const ecommerceActions = [
  "NONE",
  "SAVE_NAME",
  "SAVE_USER_DETAILS",
  "SHOW_PRODUCTS",
  "SELECT_PRODUCT",
  "SAVE_QUANTITY",
  "SHOW_CART",
  "CREATE_ORDER",
  "ORDER_CONFIRMATION",
  "PROCESS_PAYMENT",
  "VERIFY_PAYMENT",
  "CANCEL_ORDER",
  "REQUEST_REFUND",
  "START_SUPPORT",
  "CREATE_SUPPORT",
  "CREATE_FEEDBACK"
];

const bookingActions = [
  "NONE",
  "SAVE_NAME",
  "SAVE_USER_DETAILS",
  "SAVE_SERVICE",
  "SAVE_DATE",
  "SAVE_TIME",
  "BOOK_APPOINTMENT",
  "START_SUPPORT",
  "CREATE_SUPPORT",
  "CREATE_FEEDBACK"
];

const ChatbotManagement = () => {
  const [flows, setFlows] = useState([]);
  const [metadata, setMetadata] = useState({
    used: 0,
    limit: 0,
    remaining: 0,
    mode: 'starter',
    plan: 'FREE',
    message: 'Starter automation enabled'
  });
  const [clientPage, setClientPage] = useState(1);
  const clientLimit = 10;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); 
  const [businessType, setBusinessType] = useState('');
  const [availableActions, setAvailableActions] = useState([]);

  const fetchBusiness = async () => {
    try {
      const res = await api.get('/business/me');
      setBusinessType(res.data.category?.toUpperCase() || 'ECOMMERCE');
    } catch (err) {
      console.error('Failed to fetch business type', err);
    }
  };

  const fetchFlows = async () => {
    setLoading(true);
    try {
      const res = await api.get('/chatbot');
      setFlows(res.data.flows || []);
      setMetadata(res.data.metadata || {});
    } catch (error) {
      console.error('Failed to fetch flows', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusiness();
    fetchFlows();
  }, []);

  useEffect(() => {
    if (businessType === 'ECOMMERCE') {
      setAvailableActions(ecommerceActions);
    } else {
      setAvailableActions(bookingActions);
    }
  }, [businessType]);

  const clientTotalPages = Math.max(1, Math.ceil(flows.length / clientLimit));
  const visibleFlows = flows.slice((clientPage - 1) * clientLimit, clientPage * clientLimit);

  const resetForm = () => {
    setForm(initialForm);
    setEditing(null);
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.triggerKeywords || !form.responseTemplate || !form.step || !form.nextStep) {
      setMessage('Required fields missing');
      setMessageType('error');
      return;
    }

    const payload = {
      ...form,
      triggerKeywords: form.triggerKeywords.split(',').map(k => k.trim())
    };

    try {
      if (editing) {
        await api.put(`/chatbot/${editing._id}`, payload);
        setMessage('Flow updated successfully');
        setMessageType('info');
      } else {
        await api.post('/chatbot', payload);
        setMessage('New flow activated');
        setMessageType('info');
      }
      resetForm();
      fetchFlows();
    } catch (error) {
      console.error('Save failed', error);
      setMessage(error?.response?.data?.message || 'Error saving flow');
      setMessageType('error');
    }
  };

  const startEdit = (flow) => {
    setEditing(flow);
    setForm({
      triggerKeywords: (flow.triggerKeywords || []).join(', '),
      responseTemplate: flow.responseTemplate,
      step: flow.step,
      nextStep: flow.nextStep,
      action: flow.action || 'NONE',
      isActive: flow.isActive ?? true,
    });
    setMessage('');
  };

  const deleteFlow = async (id) => {
    if (!confirm('Permanently delete this automation?')) return;
    try {
      await api.delete(`/chatbot/${id}`);
      fetchFlows();
    } catch (error) {
      console.error('Deletion error', error);
    }
  };

  const isLimited = metadata.mode === 'starter' || metadata.mode === 'template';

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none uppercase italic">Flow Architecture</h1>
          <p className="mt-2 text-slate-500 font-medium">
            {metadata.message || 'Manage your automated chat paths.'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col items-center">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Automation Tier</p>
             <p className="text-sm font-bold text-slate-900 leading-none">
               {metadata.plan}
             </p>
          </div>
          <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col items-center">
             <div className="flex items-center justify-between gap-4 mb-1.5 w-full">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Availability</p>
               <p className="text-[10px] font-black text-blue-600 leading-none">
                 {metadata.remaining === 0 ? 'Upgrade' : 'Ready'}
               </p>
             </div>
             <div className="h-1 w-24 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
               <div 
                 className="h-full bg-blue-600 transition-all duration-1000"
                 style={{ width: `${metadata.limit === Infinity ? 100 : Math.min(100, (metadata.used / (metadata.limit || 1)) * 100)}%` }}
               />
             </div>
          </div>
          {isLimited && (
            <button 
              onClick={() => window.location.assign('/admin/pricing')}
              className="h-12 px-6 rounded-2xl bg-slate-900 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-slate-900/20 hover:bg-black transition-all"
            >
              Unlock Advanced
            </button>
          )}
        </div>
      </header>

      <section className="bg-white p-8 rounded-[3rem] border border-slate-200/60 shadow-sm overflow-hidden relative">
         <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-50 -mr-10 -mt-10" />
         <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
               <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <FiZap className="text-blue-600" />
                  Auto-Provisioning Engine
               </h2>
               <p className="text-xs font-medium text-slate-500 leading-relaxed">
                  Automatically seed your workspace with high-performance flows optimized for your business plan. Only active flows allowed by your current tier are shown here and executed in the simulator.
               </p>
            </div>
            <div className="flex flex-wrap gap-4">
               <button 
                  onClick={async () => {
                    if(!confirm('This will replace your current logic with the Plan Seeding. Continue?')) return;
                    try {
                      setLoading(true);
                      await api.post('/chatbot/seed');
                      fetchFlows();
                      setMessage('Plan-based flows provisioned successfully');
                    } catch(e) { 
                      setMessage(e.response?.data?.message || 'Provisioning failed');
                    } finally { setLoading(false); }
                  }}
                  className="px-8 py-4 rounded-2xl bg-blue-600 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/10"
               >
                  Run Auto-Seeder
               </button>
            </div>
         </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-12">
        <aside className="lg:col-span-4">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm sticky top-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                 {editing ? 'Modify Step' : 'Logic Creator'}
                 <span className="h-2 w-2 rounded-full bg-blue-600 block" />
              </h2>
              {isLimited && (
                <div className="group relative">
                  <FiInfo className="text-slate-300 hover:text-blue-500 cursor-help" />
                  <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-slate-900 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    {metadata.message || 'Upgrade for advanced automation.'}
                  </div>
                </div>
              )}
            </div>
            
            {message && (
              <div className={`mb-6 p-4 rounded-2xl border text-xs font-bold ${
                messageType === 'error' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-blue-50 border-blue-100 text-blue-700'
              }`}>
                {message}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Trigger Keywords</label>
                <input
                  value={form.triggerKeywords}
                  onChange={(e) => setForm({ ...form, triggerKeywords: e.target.value })}
                  className="mt-3 w-full rounded-xl border-slate-200 bg-slate-100/30 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="e.g. hi, price, menu"
                />
                <p className="mt-2 text-[9px] text-slate-400 italic">Separate with commas. Use * for catch-all.</p>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">AI Response Template</label>
                <textarea
                  value={form.responseTemplate}
                  onChange={(e) => setForm({ ...form, responseTemplate: e.target.value })}
                  className="mt-3 w-full rounded-xl border-slate-200 bg-slate-100/30 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all min-h-[100px]"
                  placeholder="Hello {{name}}, how can I help?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Current Scope</label>
                  <input
                    value={form.step}
                    onChange={(e) => setForm({ ...form, step: e.target.value })}
                    className="mt-3 w-full rounded-xl border-slate-200 bg-slate-100/30 px-4 py-3 text-xs font-bold text-slate-600 outline-none"
                    placeholder="start"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Target Step</label>
                  <input
                    value={form.nextStep}
                    onChange={(e) => setForm({ ...form, nextStep: e.target.value })}
                    className="mt-3 w-full rounded-xl border-slate-200 bg-slate-100/30 px-4 py-3 text-xs font-bold text-slate-600 outline-none"
                    placeholder="menu"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Action Module</label>
                <select
                  value={form.action}
                  onChange={(e) => setForm({ ...form, action: e.target.value })}
                  className="mt-3 w-full rounded-xl border-slate-200 bg-slate-100/30 px-4 py-3 text-xs font-black uppercase tracking-tight text-slate-600 outline-none focus:bg-white transition-all cursor-pointer"
                >
                  {availableActions.map((action) => (
                    <option key={action} value={action}>
                      {action === 'NONE' ? 'Just Reply' : action.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="submit" 
                  className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl transition-all bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700"
                >
                  {editing ? 'Synchronize' : 'Initialize'}
                </button>
                {editing && (
                  <button type="button" onClick={resetForm} className="px-6 rounded-2xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">
                    Reset
                  </button>
                )}
              </div>
            </form>
          </div>
        </aside>

        <main className="lg:col-span-8">
          <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col min-h-[700px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/30">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Keywords</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Context Chain</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Module</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Ops</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {visibleFlows.map((flow) => (
                    <tr key={flow._id} className="group hover:bg-slate-50 transition-colors duration-300">
                      <td className="px-8 py-6">
                        <div className="flex flex-wrap gap-1.5 max-w-[150px]">
                           {flow.triggerKeywords?.map(k => (
                             <span key={k} className="px-2 py-0.5 rounded-md bg-slate-100 text-[9px] font-bold text-slate-600 border border-slate-200/50">
                               {k}
                             </span>
                           ))}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                           {flow.step} <span className="mx-2 text-slate-200">→</span> {flow.nextStep}
                        </p>
                        <p className="text-xs font-medium text-slate-500 mt-1.5 line-clamp-1">{flow.responseTemplate}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className="inline-flex px-3 py-1 rounded-lg bg-blue-50 border border-blue-100 text-[9px] font-black text-blue-600 uppercase tracking-widest">
                           {flow.action === 'NONE' ? 'CORE' : flow.action}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                         <div className={`h-2 w-2 rounded-full ${flow.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-300'}`} />
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(flow)} className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-800">Edit</button>
                          <button onClick={() => deleteFlow(flow._id)} className="text-[10px] font-black uppercase text-rose-500 hover:text-rose-700">Drop</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visibleFlows.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="py-24 text-center opacity-30">
                        <div className="flex flex-col items-center">
                          <FiTerminal className="h-16 w-16 mb-4" />
                          <p className="font-black uppercase tracking-[0.2em] text-sm">Waiting for Logic...</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {flows.length > clientLimit && (
              <div className="mt-auto px-8 py-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                   {clientPage} / {clientTotalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={clientPage === 1}
                    onClick={() => setClientPage(p => p - 1)}
                    className="h-10 px-4 rounded-xl border border-slate-200 text-[10px] uppercase font-black disabled:opacity-30"
                  >
                    Prev
                  </button>
                  <button
                    disabled={clientPage >= clientTotalPages}
                    onClick={() => setClientPage(p => p + 1)}
                    className="h-10 px-6 rounded-xl bg-slate-900 text-white text-[10px] uppercase font-black disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ChatbotManagement;
