import { useEffect, useState } from 'react';
import { FiLayers, FiArrowRight } from 'react-icons/fi';
import api from '../../utils/api';

const initialForm = {
  trigger: '',
  reply: '',
  step: '',
  nextStep: '',
  action: 'NONE',
};

const Chatbot = () => {
  const [flows, setFlows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(flows.length / pageSize));
  const visibleFlows = flows.slice((page - 1) * pageSize, page * pageSize);

  const fetchFlows = async () => {
    setLoading(true);
    try {
      const response = await api.get('/chatbot');
      setFlows(response.data);
      setTotal(response.data.length);
      if (page > Math.max(1, Math.ceil(response.data.length / pageSize))) {
        setPage(1);
      }
    } catch (error) {
      console.error('Failed to fetch flows', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditing(null);
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/chatbot/${editing._id}`, form);
        setMessage('Protocol Updated Successfully.');
      } else {
        await api.post('/chatbot', form);
        setMessage('Network Node Established.');
      }
      resetForm();
      fetchFlows();
    } catch (error) {
      console.error('Unable to save flow', error);
      setMessage('Synchronization Failure: Please retry.');
    }
  };

  const startEdit = (flow) => {
    setEditing(flow);
    setForm({
      trigger: flow.trigger,
      reply: flow.reply,
      step: flow.step,
      nextStep: flow.nextStep,
      action: flow.action,
    });
    setMessage('');
  };

  const deleteFlow = async (id) => {
    if (!confirm('Are you sure you want to expunge this logic branch?')) return;
    try {
      await api.delete(`/chatbot/${id}`);
      fetchFlows();
    } catch (error) {
      console.error('Unable to delete flow', error);
    }
  };

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Logic Matrix</h1>
          <p className="mt-2 text-slate-500 font-medium">Programming neural response paths and automated decision nodes.</p>
        </div>
        <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200/60 shadow-sm">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Global Logic</p>
           <p className="text-sm font-bold text-slate-900 mt-1 uppercase">{total} Active Branches</p>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-3">
        <section className="lg:col-span-1">
           <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200/60 shadow-sm sticky top-10 overflow-hidden">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-8">
                 {editing ? 'Branch Configuration' : 'Establish Logic Path'}
                 <span className="h-2 w-2 rounded-full bg-blue-600 block mt-1" />
              </h2>
              
              {message && (
                <div className="mb-6 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 text-[10px] font-black uppercase tracking-widest text-blue-600">
                  {message}
                </div>
              )}

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">Trigger Signal</label>
                  <input
                    value={form.trigger}
                    onChange={(e) => setForm({ ...form, trigger: e.target.value })}
                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all"
                    placeholder="e.g., hi, start, purchase"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">Response Payload</label>
                  <textarea
                    value={form.reply}
                    onChange={(e) => setForm({ ...form, reply: e.target.value })}
                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all min-h-[120px] resize-none leading-relaxed"
                    placeholder="Message to be transmitted..."
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">Input Step</label>
                     <input
                       value={form.step}
                       onChange={(e) => setForm({ ...form, step: e.target.value })}
                       className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 focus:bg-white transition-all outline-none"
                       placeholder="start"
                       required
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">Next Node</label>
                     <input
                       value={form.nextStep}
                       onChange={(e) => setForm({ ...form, nextStep: e.target.value })}
                       className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 focus:bg-white transition-all outline-none"
                       placeholder="menu"
                       required
                     />
                   </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">System Action</label>
                  <select
                    value={form.action}
                    onChange={(e) => setForm({ ...form, action: e.target.value })}
                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-black uppercase text-slate-600 focus:bg-white transition-all outline-none cursor-pointer"
                  >
                    <option value="NONE">CORE_NEUTRAL</option>
                    <option value="SHOW_PRODUCTS">DISSEMINATE_CATALOG</option>
                    <option value="CREATE_ORDER">RESOLVE_LEDGER</option>
                    <option value="PROCESS_PAYMENT">INIT_SETTLEMENT</option>
                    <option value="CANCEL_ORDER">ABORT_TRANSACTION</option>
                    <option value="RETURN_ORDER">REVERSE_NODE</option>
                    <option value="SAVE_NAME">IDENT_REGISTRY</option>
                    <option value="SAVE_PRODUCT">CACHE_SELECTION</option>
                    <option value="BOOK_APPOINTMENT">SCHEDULE_RESOURCE</option>
                    <option value="CREATE_FEEDBACK">ANALYZE_SENTIMENT</option>
                    <option value="START_SUPPORT">INIT_HUMAN_OVERRIDE</option>
                    <option value="CREATE_SUPPORT">GENERATE_TICKET</option>
                  </select>
                </div>
                <div className="flex flex-col gap-3 pt-6 border-t border-slate-50">
                  <button type="submit" className="btn-primary w-full py-4 text-[10px] uppercase font-black shadow-none">
                    {editing ? 'Update Resolution' : 'Finalize Logic'}
                  </button>
                  {editing && (
                    <button type="button" onClick={resetForm} className="btn-secondary w-full py-4 text-[10px] uppercase font-black">
                      Abort Edit
                    </button>
                  )}
                </div>
              </form>
           </div>
        </section>

        <section className="lg:col-span-2">
          <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col min-h-[700px]">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                 <div className="h-10 w-10 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-4" />
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Synthesizing Database...</p>
              </div>
            ) : flows.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center opacity-30 select-none">
                 <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                    <FiLayers className="text-slate-400 h-8 w-8" />
                 </div>
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest">Logic Tabula Rasa</h2>
                 <p className="text-[10px] font-black uppercase tracking-widest mt-2">Create your first branch to begin neural shaping.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/30">
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Signal (Trigger)</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Resolution Stream</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Path Dynamics</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Action Node</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Utility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {visibleFlows.map((flow) => (
                      <tr key={flow._id} className="group hover:bg-slate-50 transition-colors duration-300">
                        <td className="px-8 py-6">
                           <div className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-xs font-black uppercase tracking-widest w-fit">
                              {flow.trigger}
                           </div>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-sm font-semibold text-slate-700 max-w-[200px] line-clamp-2 leading-relaxed">{flow.reply}</p>
                        </td>
                        <td className="px-8 py-6">
                           <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                              {flow.step} 
                              <FiArrowRight className="text-blue-500 h-3 w-3" />
                              {flow.nextStep}
                           </p>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-md bg-slate-900 text-white shadow-sm border border-slate-800">
                            {flow.action}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                           <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEdit(flow)} className="text-[10px] font-black uppercase text-blue-600 hover:underline">Revise</button>
                              <button onClick={() => deleteFlow(flow._id)} className="text-[10px] font-black uppercase text-rose-500 hover:underline">Expunge</button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="mt-auto px-8 py-6 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Node {((page - 1) * pageSize) + 1} — {Math.min(page * pageSize, flows.length)} of {flows.length} Resolution Paths
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="btn-secondary h-10 px-4 text-[10px] font-black uppercase"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages}
                  className="btn-primary h-10 px-6 text-[10px] font-black uppercase shadow-none"
                >
                  Next Page
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Chatbot;
