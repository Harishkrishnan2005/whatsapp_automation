import { useEffect, useState, useMemo } from 'react';
import { 
  FiLayers, 
  FiArrowRight, 
  FiPlus, 
  FiTrash2, 
  FiEdit3, 
  FiDatabase, 
  FiActivity, 
  FiZap,
  FiShoppingCart,
  FiCalendar,
  FiInfo,
} from 'react-icons/fi';
import api from '../../utils/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const initialForm = {
  trigger: '',
  reply: '',
  step: '',
  nextStep: '',
  action: 'NONE',
  category: 'GENERAL',
};

const CATEGORIES = [
  { id: 'GENERAL', label: 'General Logic', icon: FiActivity, color: 'slate' },
  { id: 'ECOMMERCE', label: 'E-Commerce', icon: FiShoppingCart, color: 'blue' },
  { id: 'BOOKING', label: 'Booking', icon: FiCalendar, color: 'indigo' },
];

const ACTIONS = [
  { id: 'NONE', label: 'No Action' },
  { id: 'SHOW_PRODUCTS', label: 'Show Catalog' },
  { id: 'ADD_TO_CART', label: 'Add to Cart' },
  { id: 'VIEW_CART', label: 'View Cart' },
  { id: 'START_ORDER_CONFIRMATION', label: 'Confirm Order' },
  { id: 'CREATE_ORDER', label: 'Create Order' },
  { id: 'PROCESS_PAYMENT', label: 'Init Payment' },
  { id: 'BOOK_APPOINTMENT', label: 'Book Appointment' },
  { id: 'START_SUPPORT', label: 'Human Takeover' },
];

const Chatbot = () => {
  const [flows, setFlows] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(flows.length / pageSize));
  const visibleFlows = flows.slice((page - 1) * pageSize, page * pageSize);

  const fetchFlows = async () => {
    setLoading(true);
    try {
      const response = await api.get('/chatbot');
      setFlows(response.data);
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
    setStatusMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/chatbot/${editing._id}`, form);
        setStatusMsg({ type: 'success', text: 'Branch updated successfully.' });
      } else {
        await api.post('/chatbot', form);
        setStatusMsg({ type: 'success', text: 'New node established.' });
      }
      setTimeout(resetForm, 2000);
      fetchFlows();
    } catch (error) {
      setStatusMsg({ type: 'error', text: 'Synchronization failed.' });
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
      category: flow.category || 'GENERAL',
    });
    setStatusMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteFlow = async (id) => {
    if (!confirm('Are you sure you want to expunge this logic branch?')) return;
    try {
      await api.delete(`/chatbot/${id}`);
      fetchFlows();
    } catch (error) {
      console.error('Delete error', error);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Logic Engine</h1>
          <p className="text-sm text-slate-500 font-bold mt-1">Design automated neural response paths</p>
        </div>
        <div className="flex items-center gap-4">
          <Card className="!p-3 !px-5 border-none shadow-sm flex items-center gap-3">
            <FiZap className="text-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Nodes</span>
            <span className="text-sm font-black text-slate-900">{flows.length}</span>
          </Card>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Section */}
        <div className="lg:col-span-4 sticky top-8">
          <Card 
            title={editing ? 'Refine Node' : 'Initialize Node'} 
            subtitle="Define trigger and resolution"
          >
            {statusMsg && (
              <div className={`p-4 rounded-2xl mb-6 text-[10px] font-black uppercase tracking-widest ${statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                {statusMsg.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Step</label>
                  <Input 
                    placeholder="e.g. start" 
                    value={form.step} 
                    onChange={(e) => setForm({...form, step: e.target.value})} 
                    required 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Next Step</label>
                  <Input 
                    placeholder="e.g. menu" 
                    value={form.nextStep} 
                    onChange={(e) => setForm({...form, nextStep: e.target.value})} 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Trigger Keywords</label>
                <Input 
                  placeholder="Comma separated: hi, hello, help" 
                  value={form.trigger} 
                  onChange={(e) => setForm({...form, trigger: e.target.value})} 
                  required 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bot Response</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-600/5 transition-all min-h-[100px] resize-none"
                  placeholder="Enter the automated reply..."
                  value={form.reply}
                  onChange={(e) => setForm({...form, reply: e.target.value})}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-3 text-[10px] font-black text-slate-600 uppercase outline-none"
                    value={form.category}
                    onChange={(e) => setForm({...form, category: e.target.value})}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Action</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-3 text-[10px] font-black text-slate-600 uppercase outline-none"
                    value={form.action}
                    onChange={(e) => setForm({...form, action: e.target.value})}
                  >
                    {ACTIONS.map(act => (
                      <option key={act.id} value={act.id}>{act.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1 !py-4 shadow-xl shadow-blue-600/20">
                  {editing ? 'Save Changes' : 'Initialize Node'}
                </Button>
                {editing && (
                  <Button variant="outline" type="button" onClick={resetForm} className="!p-4">
                    <FiTrash2 />
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </div>

        {/* Nodes List Section */}
        <div className="lg:col-span-8">
          <Card title="Node Topology" subtitle="Visualizing automated paths">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-300">
                <FiDatabase className="h-10 w-10 animate-bounce mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">Accessing core memory...</p>
              </div>
            ) : flows.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-300 opacity-50">
                <FiLayers className="h-12 w-12 mb-4" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-400">Engine in stasis</p>
                <p className="text-[10px] font-bold mt-2">Initialize your first node to begin</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                      <th className="px-6 pb-4 text-left">Category</th>
                      <th className="px-6 pb-4 text-left">Trigger</th>
                      <th className="px-6 pb-4 text-left">Path</th>
                      <th className="px-6 pb-4 text-left">Action</th>
                      <th className="px-6 pb-4 text-right">Ops</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {visibleFlows.map((flow) => {
                      const category = CATEGORIES.find(c => c.id === flow.category) || CATEGORIES[0];
                      const CategoryIcon = category.icon;
                      return (
                        <tr key={flow._id} className="group hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-5">
                            <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-tighter ${category.color === 'blue' ? 'text-blue-600' : category.color === 'indigo' ? 'text-indigo-600' : 'text-slate-500'}`}>
                              <CategoryIcon />
                              {category.id}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <Badge variant="processing" size="sm" className="font-black">
                              {flow.trigger}
                            </Badge>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase">
                              <span className="opacity-40">{flow.step}</span>
                              <FiArrowRight className="text-blue-600" />
                              <span>{flow.nextStep}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className="text-[9px] font-black px-2 py-1 bg-slate-900 text-white rounded-md uppercase tracking-widest">
                              {flow.action}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => startEdit(flow)}
                                className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                              >
                                <FiEdit3 className="h-3.5 w-3.5" />
                              </button>
                              <button 
                                onClick={() => deleteFlow(flow._id)}
                                className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                              >
                                <FiTrash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-50">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 Resolution {((page - 1) * pageSize) + 1} — {Math.min(page * pageSize, flows.length)} of {flows.length}
               </p>
               <div className="flex gap-2">
                 <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                   Previous
                 </Button>
                 <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                   Next
                 </Button>
               </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
