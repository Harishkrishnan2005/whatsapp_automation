import { useEffect, useState } from 'react';
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
    try {
      if (editing) {
        await api.put(`/chatbot/${editing._id}`, form);
        setMessage('Flow updated successfully');
      } else {
        await api.post('/chatbot', form);
        setMessage('Flow added successfully');
      }
      resetForm();
      fetchFlows();
    } catch (error) {
      console.error('Unable to save flow', error);
      setMessage('Unable to save flow. Please try again.');
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
      await api.put(`/chatbot/${flow._id}`, {
        trigger: flow.trigger,
        reply: flow.reply,
        step: flow.step,
        nextStep: flow.nextStep,
        action: flow.action,
        isActive: !flow.isActive,
      });
      fetchFlows();
    } catch (error) {
      console.error('Unable to update flow status', error);
    }
  };

  const deleteFlow = async (id) => {
    if (!confirm('Are you sure you want to delete this flow?')) return;
    try {
      await api.delete(`/chatbot/${id}`);
      fetchFlows();
    } catch (error) {
      console.error('Unable to delete flow', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 md:p-8 text-white">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="rounded-2xl backdrop-blur-md border border-white/10 shadow-xl bg-slate-950/30 p-6 flex-1">
          <h1 className="text-4xl font-bold text-white">Chatbot Flow Management</h1>
          <p className="text-cyan-200 mt-2">Create and manage dynamic chatbot conversation flows.</p>
        </div>
        <div className="rounded-2xl backdrop-blur-md border border-white/10 shadow-xl bg-slate-950/30 p-6 w-full lg:w-auto">
          <p className="text-sm text-cyan-200 font-medium">Total Flows</p>
          <p className="text-3xl font-bold text-white">{total}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-1 rounded-2xl backdrop-blur-md border border-white/10 shadow-xl bg-slate-950/30 p-6">
          <h2 className="text-xl font-semibold mb-6 text-white">{editing ? 'Edit Flow' : 'Add New Flow'}</h2>
          {message && <div className="mb-4 text-sm text-green-100 bg-emerald-500/10 backdrop-blur-sm border border-green-500/20 p-3 rounded-xl">{message}</div>}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-cyan-200 font-medium mb-2">Trigger</label>
              <input
                value={form.trigger}
                onChange={(e) => setForm({ ...form, trigger: e.target.value })}
                className="w-full border border-white/10 bg-slate-900/40 backdrop-blur-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                placeholder="e.g., hi, hello, 1, ask_address (for system prompts)"
                required
              />
              <p className="mt-2 text-xs text-slate-400">
                Use <code className="bg-slate-800 px-1 rounded">step=system</code> to customize built-in prompts like menu, ask_name_prompt, ask_age_prompt, ask_address, ask_quantity, ask_coupon, appointment_prompt.
              </p>
            </div>
            <div>
              <label className="block text-cyan-200 font-medium mb-2">Reply</label>
              <textarea
                value={form.reply}
                onChange={(e) => setForm({ ...form, reply: e.target.value })}
                className="w-full border border-white/10 bg-slate-900/40 backdrop-blur-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none resize-none"
                placeholder="Bot response message"
                rows="3"
                required
              />
            </div>
            <div>
              <label className="block text-cyan-200 font-medium mb-2">Step</label>
              <input
                value={form.step}
                onChange={(e) => setForm({ ...form, step: e.target.value })}
                className="w-full border border-white/10 bg-slate-900/40 backdrop-blur-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                placeholder="e.g., start, menu"
                required
              />
            </div>
            <div>
              <label className="block text-cyan-200 font-medium mb-2">Next Step</label>
              <input
                value={form.nextStep}
                onChange={(e) => setForm({ ...form, nextStep: e.target.value })}
                className="w-full border border-white/10 bg-slate-900/40 backdrop-blur-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                placeholder="e.g., menu, order"
                required
              />
            </div>
            <div>
              <label className="block text-cyan-200 font-medium mb-2">Action</label>
              <select
                value={form.action}
                onChange={(e) => setForm({ ...form, action: e.target.value })}
                className="w-full border border-white/10 bg-slate-900/40 backdrop-blur-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
              >
                <option value="NONE">NONE</option>
                <option value="SHOW_PRODUCTS">SHOW_PRODUCTS</option>
                <option value="CREATE_ORDER">CREATE_ORDER</option>
                <option value="PROCESS_PAYMENT">PROCESS_PAYMENT</option>
                <option value="CANCEL_ORDER">CANCEL_ORDER</option>
                <option value="RETURN_ORDER">RETURN_ORDER</option>
                <option value="SAVE_NAME">SAVE_NAME</option>
                <option value="SAVE_PRODUCT">SAVE_PRODUCT</option>
                <option value="BOOK_APPOINTMENT">BOOK_APPOINTMENT</option>
                <option value="CREATE_FEEDBACK">CREATE_FEEDBACK</option>
                <option value="START_SUPPORT">START_SUPPORT</option>
                <option value="CREATE_SUPPORT">CREATE_SUPPORT</option>
              </select>
            </div>
            <div>
              <label className="block text-cyan-200 font-medium mb-2">Status</label>
              <select
                value={form.isActive ? 'active' : 'inactive'}
                onChange={(e) => setForm({ ...form, isActive: e.target.value === 'active' })}
                className="w-full border border-white/10 bg-slate-900/40 backdrop-blur-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-500/80 hover:bg-blue-600/80 backdrop-blur-sm border border-blue-400/50 text-white px-4 py-3 rounded-xl font-semibold transition-all"
              >
                {editing ? 'Update' : 'Add'} Flow
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-3 border border-white/10 bg-slate-950/40 backdrop-blur-sm rounded-xl font-semibold hover:bg-slate-900/60 transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="lg:col-span-2 rounded-2xl backdrop-blur-md border border-white/10 shadow-xl bg-slate-950/30 p-6">
          <h2 className="text-xl font-semibold mb-6 text-white">Chatbot Flows</h2>
          {loading ? (
            <div className="text-center py-8 text-cyan-200">Loading...</div>
          ) : flows.length === 0 ? (
            <div className="text-center py-8 text-cyan-200">No flows created yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 text-cyan-200 font-semibold">Trigger</th>
                    <th className="text-left py-3 text-cyan-200 font-semibold">Reply</th>
                    <th className="text-left py-3 text-cyan-200 font-semibold">Step → Next</th>
                    <th className="text-left py-3 text-cyan-200 font-semibold">Action</th>
                    <th className="text-left py-3 text-cyan-200 font-semibold">Status</th>
                    <th className="text-left py-3 text-cyan-200 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleFlows.map((flow) => (
                    <tr key={flow._id} className="border-b border-white/10 hover:bg-blue-500/10 backdrop-blur-sm transition-colors">
                      <td className="py-3 text-white">{flow.trigger}</td>
                      <td className="py-3 text-slate-300 max-w-xs truncate">{flow.reply}</td>
                      <td className="py-3 text-slate-300">{flow.step} → {flow.nextStep}</td>
                      <td className="py-3">
                        <span className="rounded-full bg-cyan-500/10 backdrop-blur-sm border border-cyan-400/20 px-3 py-1 text-xs font-semibold text-cyan-100">
                          {flow.action}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            flow.isActive
                              ? 'bg-emerald-500/15 border border-emerald-400/20 text-emerald-100'
                              : 'bg-rose-500/15 border border-rose-400/20 text-rose-100'
                          }`}
                        >
                          {flow.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => startEdit(flow)}
                          className="text-cyan-200 hover:text-white mr-3 font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleFlowStatus(flow)}
                          className="text-amber-300 hover:text-amber-100 mr-3 font-medium transition-colors"
                        >
                          {flow.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => deleteFlow(flow._id)}
                          className="text-red-400 hover:text-red-200 font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={() => setClientPage((prev) => Math.max(1, prev - 1))}
              disabled={clientPage === 1}
              className="rounded-xl bg-slate-900/40 backdrop-blur-sm border border-white/10 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-all"
            >
              Previous
            </button>
            <button
              onClick={() => setClientPage((prev) => Math.min(clientTotalPages, prev + 1))}
              disabled={clientPage >= clientTotalPages}
              className="rounded-xl bg-blue-500/80 hover:bg-blue-600/80 backdrop-blur-sm border border-blue-400/50 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-all"
            >
              Next
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ChatbotManagement;
