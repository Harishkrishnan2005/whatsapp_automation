import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageCircle, FiCheckCircle, FiClock, FiAlertCircle, FiSend, FiUser, FiSearch, FiFilter } from 'react-icons/fi';
import api from '../../utils/api';

const SupportTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [reply, setReply] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/support');
      setTickets(response.data);
    } catch (error) {
      console.error('Failed to fetch tickets', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() || !selectedTicket) return;

    try {
      const response = await api.post(`/support/${selectedTicket._id}/reply`, { message: reply });
      setSelectedTicket(response.data);
      setTickets(prev => prev.map(t => t._id === response.data._id ? response.data : t));
      setReply('');
    } catch (error) {
      console.error('Failed to send reply', error);
    }
  };

  const updateStatus = async (status) => {
    if (!selectedTicket) return;
    try {
      const response = await api.put(`/support/${selectedTicket._id}/status`, { status });
      setSelectedTicket(response.data);
      setTickets(prev => prev.map(t => t._id === response.data._id ? response.data : t));
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (filter !== 'ALL' && t.status !== filter) return false;
    if (search && !t.customerId?.phone?.includes(search) && !t.subject?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'RESOLVED': return <FiCheckCircle className="text-emerald-500" />;
      case 'IN_PROGRESS': return <FiClock className="text-blue-500" />;
      default: return <FiAlertCircle className="text-amber-500" />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6 animate-fade-in overflow-hidden">
      {/* Left Sidebar: Ticket List */}
      <div className="w-1/3 bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-4 flex items-center gap-2">
            Support Desk
            <span className="h-2 w-2 rounded-full bg-blue-600 block" />
          </h1>
          
          <div className="relative mb-4">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Subject or Phone..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
            {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          {loading ? (
             [1,2,3,4,5].map(i => <div key={i} className="h-24 bg-slate-50 rounded-3xl animate-pulse" />)
          ) : filteredTickets.map(ticket => (
            <div 
              key={ticket._id}
              onClick={() => setSelectedTicket(ticket)}
              className={`p-5 rounded-[2rem] border transition-all cursor-pointer group ${selectedTicket?._id === ticket._id ? 'bg-slate-900 border-slate-900 shadow-xl' : 'bg-white border-slate-100 hover:border-blue-500/30 hover:bg-blue-50/30'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${selectedTicket?._id === ticket._id ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-400'}`}>
                  {ticket.status}
                </span>
                <span className={`text-[9px] font-bold ${selectedTicket?._id === ticket._id ? 'text-slate-400' : 'text-slate-400'}`}>
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h3 className={`text-sm font-black uppercase tracking-tight line-clamp-1 mb-1 ${selectedTicket?._id === ticket._id ? 'text-white' : 'text-slate-800'}`}>
                {ticket.subject}
              </h3>
              <p className={`text-[10px] font-bold flex items-center gap-1 ${selectedTicket?._id === ticket._id ? 'text-blue-400' : 'text-slate-400'}`}>
                <FiUser className="text-[12px]" />
                {ticket.customerId?.name || 'Anonymous'} ({ticket.customerId?.phone})
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Content: Ticket Chat */}
      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm flex flex-col overflow-hidden relative">
        <AnimatePresence mode="wait">
          {selectedTicket ? (
            <motion.div 
              key={selectedTicket._id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col h-full"
            >
              {/* Ticket Header */}
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div>
                   <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(selectedTicket.status)}
                      <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{selectedTicket.subject}</h2>
                   </div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                     Customer: {selectedTicket.customerId?.name} • {selectedTicket.customerId?.phone}
                   </p>
                </div>
                
                <div className="flex gap-2">
                   {selectedTicket.status !== 'RESOLVED' && (
                     <button 
                        onClick={() => updateStatus('RESOLVED')}
                        className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                      >
                        Mark Resolved
                     </button>
                   )}
                   {selectedTicket.status === 'RESOLVED' && (
                     <button 
                        onClick={() => updateStatus('OPEN')}
                        className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
                      >
                        Reopen Ticket
                     </button>
                   )}
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6 bg-slate-50/50">
                {/* Original Message */}
                <div className="max-w-[80%]">
                   <div className="bg-white p-6 rounded-3xl rounded-tl-none border border-slate-100 shadow-sm relative">
                      <div className="absolute top-0 -left-2 w-2 h-4 bg-white clip-path-tail" />
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 opacity-60">Customer Request</p>
                      <p className="text-sm font-medium text-slate-700 leading-relaxed">{selectedTicket.message}</p>
                      <span className="text-[9px] font-bold text-slate-400 mt-4 block">{new Date(selectedTicket.createdAt).toLocaleTimeString()}</span>
                   </div>
                </div>

                {/* Replies */}
                {selectedTicket.replies?.map((item, idx) => (
                  <div key={idx} className={`flex ${['admin', 'super_admin'].includes(item.sender) ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-6 rounded-3xl relative shadow-sm ${['admin', 'super_admin'].includes(item.sender) ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}`}>
                       <p className={`text-[9px] font-black uppercase tracking-widest mb-2 opacity-50 ${['admin', 'super_admin'].includes(item.sender) ? 'text-blue-300' : 'text-slate-400'}`}>
                         {item.sender === 'admin' ? 'Agent Reply' : 'Customer'}
                       </p>
                       <p className="text-sm font-medium leading-relaxed">{item.message}</p>
                       <span className="text-[9px] font-bold mt-4 block opacity-40">{new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              {selectedTicket.status !== 'RESOLVED' && (
                 <form onSubmit={handleSendReply} className="p-8 border-t border-slate-50 flex items-center gap-4 bg-white">
                    <input 
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Type your response here..."
                      className="flex-1 px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                    />
                    <button type="submit" className="h-14 w-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all">
                       <FiSend className="text-xl" />
                    </button>
                 </form>
              )}
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
               <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-6">
                  <FiMessageCircle className="text-4xl text-blue-500" />
               </div>
               <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Select a ticket to respond</h3>
               <p className="max-w-xs text-sm font-medium text-slate-400">Choose a support request from the list to start assisting your customers.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SupportTickets;
