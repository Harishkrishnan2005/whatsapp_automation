import { useEffect, useState } from 'react';
import { FiMessageCircle, FiPlus, FiTerminal, FiActivity } from 'react-icons/fi';
import api from '../../utils/api';

const initialForm = {
  trigger: '',
  reply: '',
  step: '',
  nextStep: '',
  action: 'NONE',
  isActive: true,
};

const ChatbotManagement = () => {
  const [flows, setFlows] = useState([]);
  const [total, setTotal] = useState(0);
  const [clientPage, setClientPage] = useState(1);
  const clientLimit = 10;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');

  const fetchFlows = async () => {
    setLoading(true);
    try {
      const response = await api.get('/chatbot');
      setFlows(response.data);
      setTotal(response.data.length);
    } catch (error) {
      console.error('Failed to fetch flows', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, []);

  const clientTotalPages = Math.max(1, Math.ceil(flows.length / clientLimit));
  const visibleFlows = flows.slice((clientPage - 1) * clientLimit, clientPage * clientLimit);

  const resetForm = () => {
    setForm(initialForm);
    setEditing(null);
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.trigger.trim() || !form.reply.trim() || !form.step.trim() || !form.nextStep.trim()) {
      setMessage('Required fields missing');
      return;
    }
    try {
      if (editing) {
        await api.put(`/chatbot/${editing._id}`, form);
        setMessage('Node updated');
      } else {
        await api.post('/chatbot', form);
        setMessage('Node activated');
      }
      resetForm();
      fetchFlows();
    } catch (error) {
      console.error('Save failed', error);
      setMessage(error?.response?.data?.message || 'Synchronization error');
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
      isActive: flow.isActive ?? true,
    });
    setMessage('');
  };

  const toggleFlowStatus = async (flow) => {
    try {
      await api.put(`/chatbot/${flow._id}`, { ...flow, isActive: !flow.isActive });
      fetchFlows();
    } catch (error) {
      console.error('Toggle failed', error);
    }
  };

  const deleteFlow = async (id) => {
    if (!confirm('Confirm deletion of this logic module?')) return;
    try {
      await api.delete(`/chatbot/${id}`);
      fetchFlows();
    } catch (error) {
      console.error('Deletion error', error);
    }
  };

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Chatbot Settings</h1>
          <p className="mt-1 text-slate-500 font-medium">Create automated chat paths for your customers.</p>
        </div>
        <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200/60 shadow-sm">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Settings</p>
           <p className="text-sm font-bold text-slate-900 mt-1">{total} Responses Active</p>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-12">
        <aside className="lg:col-span-4">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm sticky top-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
               {editing ? 'Edit Step' : 'Add New Step'}
               <span className="h-2 w-2 rounded-full bg-blue-600 block" />
            </h2>
            
            {message && <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-100 text-xs font-bold text-blue-700">{message}</div>}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Customer Message</label>
                <input
                  value={form.trigger}
                  onChange={(e) => setForm({ ...form, trigger: e.target.value })}
                  className="mt-3 w-full rounded-xl border-slate-200 bg-slate-100/30 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="e.g. Hello, 1, price"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Bot Reply</label>
                <textarea
                  value={form.reply}
                  onChange={(e) => setForm({ ...form, reply: e.target.value })}
                  className="mt-3 w-full rounded-xl border-slate-200 bg-slate-100/30 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all min-h-[100px]"
                  placeholder="What should the bot say?"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Current Step</label>
                  <input
                    value={form.step}
                    onChange={(e) => setForm({ ...form, step: e.target.value })}
                    className="mt-3 w-full rounded-xl border-slate-200 bg-slate-100/30 px-4 py-3 text-xs font-bold text-slate-600 outline-none"
                    placeholder="start"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Next Step</label>
                  <input
                    value={form.nextStep}
                    onChange={(e) => setForm({ ...form, nextStep: e.target.value })}
                    className="mt-3 w-full rounded-xl border-slate-200 bg-slate-100/30 px-4 py-3 text-xs font-bold text-slate-600 outline-none"
                    placeholder="menu"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Bot Action</label>
                <select
                  value={form.action}
                  onChange={(e) => setForm({ ...form, action: e.target.value })}
                  className="mt-3 w-full rounded-xl border-slate-200 bg-slate-100/30 px-4 py-3 text-xs font-black uppercase tracking-tight text-slate-600 outline-none focus:bg-white transition-all cursor-pointer"
                >
                  <option value="NONE">Just Send Reply</option>
                  <option value="SHOW_PRODUCTS">Show Products</option>
                  <option value="CREATE_ORDER">Create Order</option>
                  <option value="BOOK_APPOINTMENT">Book Appointment</option>
                  <option value="SAVE_NAME">Ask for Name</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 py-4 text-xs shadow-none">
                  {editing ? 'Update Step' : 'Add Step'}
                </button>
                {editing && (
                  <button type="button" onClick={resetForm} className="btn-secondary px-6 text-xs">
                    Cancel
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
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Message</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Flow Steps</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Action</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {visibleFlows.map((flow) => (
                    <tr key={flow._id} className="group hover:bg-slate-50 transition-colors duration-300">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                           <div className="h-2 w-2 rounded-full bg-blue-500" />
                           <span className="text-sm font-bold text-slate-900 tracking-tight">{flow.trigger}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                           {flow.step} <span className="mx-2 text-slate-200">→</span> {flow.nextStep}
                        </p>
                        <p className="text-xs font-medium text-slate-500 mt-1.5 line-clamp-1">{flow.reply}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className="inline-flex px-3 py-1 rounded-lg bg-blue-50 border border-blue-100 text-[9px] font-black text-blue-600 uppercase tracking-widest shadow-sm shadow-blue-900/5">
                           {flow.action === 'NONE' ? 'REPLY' : flow.action}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                         <div className={`h-2.5 w-2.5 rounded-full ring-4 ring-white shadow-sm ${flow.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(flow)} className="text-[10px] font-black uppercase text-blue-600 hover:tracking-[0.1em] transition-all">Edit</button>
                          <div className="h-3 w-[1px] bg-slate-200" />
                          <button onClick={() => deleteFlow(flow._id)} className="text-[10px] font-black uppercase text-rose-500 hover:tracking-[0.1em] transition-all">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visibleFlows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-24 text-center opacity-30">
                        <div className="flex flex-col items-center">
                          <FiTerminal className="h-16 w-16 mb-4" />
                          <p className="font-black uppercase tracking-[0.2em] text-sm">No Responses Found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {flows.length > clientLimit && (
              <div className="mt-auto px-8 py-6 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Page {clientPage} of {clientTotalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={clientPage === 1}
                    onClick={() => setClientPage(p => p - 1)}
                    className="btn-secondary h-10 px-4 text-[10px] uppercase font-black"
                  >
                    Back
                  </button>
                  <button
                    disabled={clientPage >= clientTotalPages}
                    onClick={() => setClientPage(p => p + 1)}
                    className="btn-primary h-10 px-6 text-[10px] uppercase font-black"
                  >
                    Advance
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
