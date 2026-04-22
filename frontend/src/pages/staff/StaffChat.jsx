import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageSquare, FiSend, FiXCircle, FiInbox, FiClock, FiZap, FiCalendar } from 'react-icons/fi';
import api from '../../utils/api';

const StaffChat = () => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [quickReplies, setQuickReplies] = useState([]);
  const [page, setPage] = useState(1);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [linkedAppointment, setLinkedAppointment] = useState(null);

  useEffect(() => {
    fetchChats();
    fetchQuickReplies();
    
    // REAL-TIME SYNC: Refresh chat queue every 30s
    const queueInterval = setInterval(fetchChats, 30000);
    return () => clearInterval(queueInterval);
  }, [page]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages();
      fetchLinkedAppointment();
      
      // REAL-TIME SYNC: Refresh message transmission every 5s for responsiveness
      const msgInterval = setInterval(fetchMessages, 5000);
      return () => clearInterval(msgInterval);
    } else {
      setLinkedAppointment(null);
    }
  }, [selectedChat]);

  const fetchLinkedAppointment = async () => {
    try {
      const customerId = selectedChat.customerId?._id || selectedChat.customerId;
      const response = await api.get(`/appointments/customer/${customerId}`);
      // Sort by date and take the most relevant one (upcoming or most recent)
      const apts = response.data || [];
      const active = apts.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      setLinkedAppointment(active);
    } catch (error) {
      console.error('Error fetching linked appointment:', error);
    }
  };

  const fetchChats = async () => {
    try {
      const response = await api.get(`/conversations?page=${page}&limit=10`);
      setChats(response.data.conversations || []);
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const fetchQuickReplies = async () => {
    try {
      const response = await api.get('/quick-replies');
      setQuickReplies(response.data || []);
    } catch (error) {
      console.error('Error fetching quick replies:', error);
    }
  };

  const fetchMessages = async () => {
    if (!selectedChat) return;
    setLoadingMessages(true);
    try {
      const response = await api.get(`/conversations/id/${selectedChat._id}/messages`);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const selectChat = (chat) => {
    setSelectedChat(chat);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    try {
      await api.post(`/conversations/id/${selectedChat._id}/messages`, { text: newMessage });
      setNewMessage('');
      fetchMessages();
      fetchChats();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const useQuickReply = (reply) => {
    setNewMessage(reply.message);
  };

  const closeChat = async () => {
    if (!selectedChat) return;
    if (!confirm('Finalize and close this transmission node?')) return;
    try {
      await api.put(`/conversations/id/${selectedChat._id}/close`, {});
      fetchChats();
      setSelectedChat(null);
    } catch (error) {
      console.error('Error closing chat:', error);
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] animate-fade-in">
      {/* Dynamic Command Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 shrink-0">
        <div>
          <div className="flex items-center gap-3">
             <h1 className="text-3xl font-black text-slate-900 tracking-tight">Specialist Inbox</h1>
             <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Transmission Control</span>
          </div>
          <p className="mt-1 text-slate-500 font-medium tracking-tight">Real-time intelligence nodes and customer engagement cycles.</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status</p>
                 <p className="text-sm font-black text-slate-900 mt-1 uppercase leading-none">Operational</p>
              </div>
           </div>
           <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
              <FiMessageSquare className="text-blue-600 h-5 w-5" />
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Queue</p>
                 <p className="text-sm font-black text-slate-900 mt-1 uppercase leading-none">{chats.length} Active Nodes</p>
              </div>
           </div>
        </div>
      </header>

      <div className="flex gap-8 flex-1 min-h-0 overflow-hidden">
        {/* Contact Matrix Sidebar */}
        <aside className="w-full lg:w-[400px] flex flex-col bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden shrink-0">
          <div className="p-6 border-b border-slate-50 bg-slate-50/20">
             <div className="relative group">
                <FiInbox className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input 
                  type="text" 
                  placeholder="Filter signals..." 
                  className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-100/50 transition-all"
                />
             </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
            <AnimatePresence mode="popLayout">
              {chats.map((chat) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={chat._id}
                  onClick={() => selectChat(chat)}
                  className={`p-5 rounded-[1.75rem] cursor-pointer transition-all duration-300 flex items-center gap-4 relative group ${
                    selectedChat?._id === chat._id
                      ? 'bg-blue-600 shadow-xl shadow-blue-600/20'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-xs shadow-lg transition-all duration-300 ${
                    selectedChat?._id === chat._id ? 'bg-white text-blue-600 scale-105' : 'bg-slate-900 text-white'
                  }`}>
                    {chat.customerId?.name ? chat.customerId.name[0].toUpperCase() : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                       <p className={`text-sm font-black truncate leading-none uppercase tracking-tight ${selectedChat?._id === chat._id ? 'text-white' : 'text-slate-900'}`}>{chat.customerId?.name || 'GUEST'}</p>
                       <span className={`text-[8px] font-black uppercase tracking-widest shrink-0 ml-2 ${selectedChat?._id === chat._id ? 'text-blue-100/60' : 'text-slate-400'}`}>
                          {new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </span>
                    </div>
                    <p className={`text-[10px] truncate leading-none ${selectedChat?._id === chat._id ? 'text-blue-100/80 font-medium' : 'text-slate-500 font-bold'}`}>
                       {chat.lastMessage || 'No recent activity'}
                    </p>
                  </div>
                  {chat.unreadCount > 0 && (
                    <div className="h-5 min-w-[20px] px-1.5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-bounce shadow-lg shadow-rose-500/20">
                       {chat.unreadCount}
                    </div>
                  )}
                </motion.div>
              ))}
              {chats.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 opacity-20 grayscale">
                   <FiMessageSquare className="h-12 w-12 mb-4" />
                   <p className="text-[10px] font-black uppercase tracking-widest text-center">No Signals Detected</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Buffer Page {page}</p>
             <div className="flex gap-2">
                <button 
                  disabled={page === 1} 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-300 disabled:opacity-30 transition-all"
                >
                  <FiClock className="h-3 w-3" />
                </button>
                <button 
                  onClick={() => setPage(p => p + 1)}
                  className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center hover:bg-black transition-all"
                >
                  <FiZap className="h-3 w-3" />
                </button>
             </div>
          </div>
        </aside>

        {/* Intelligence Stream Matrix */}
        <main className="flex-1 flex flex-col bg-white rounded-[2.5rem] lg:rounded-[3rem] border border-slate-200/60 shadow-sm overflow-hidden relative">
          <AnimatePresence mode="wait">
            {selectedChat ? (
              <motion.div 
                key={selectedChat._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col h-full"
              >
                {/* Node Header */}
                <header className="px-8 py-6 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
                   <div className="flex items-center gap-5">
                      <div className="h-14 w-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shadow-xl ring-4 ring-white">
                         {selectedChat.customerId?.name ? selectedChat.customerId.name[0].toUpperCase() : '?'}
                      </div>
                      <div>
                         <h2 className="text-xl font-black text-slate-900 leading-none tracking-tight uppercase">{selectedChat.customerId?.name}</h2>
                         <div className="flex items-center gap-2.5 mt-2.5">
                            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[9px] font-black text-blue-600 border border-blue-100 uppercase tracking-widest">{selectedChat.customerId?.phone}</span>
                            <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Active Signal</span>
                         </div>
                      </div>
                   </div>

                   <button
                     onClick={closeChat}
                     className="px-6 py-2.5 rounded-xl border border-rose-100 bg-rose-50 text-rose-600 text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all flex items-center gap-2"
                   >
                     <FiXCircle className="h-4 w-4" />
                     Archive Channel
                   </button>
                </header>

                {/* Message Ledger */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6 bg-slate-50/30">
                  {loadingMessages ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-30 grayscale">
                       <div className="h-8 w-8 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-4" />
                       <p className="text-[10px] font-black uppercase tracking-widest italic">Synchronizing Logs...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-10 grayscale select-none">
                      <FiMessageSquare className="h-24 w-24 mb-6" />
                      <p className="font-black uppercase tracking-[0.4em] text-xs">Node History Clear</p>
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      const isOutgoing = msg.sender === 'staff' || msg.sender === 'admin';

                      return (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          key={index} 
                          className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] ${isOutgoing ? 'pl-12' : 'pr-12'}`}>
                             <div className={`px-6 py-4 rounded-[1.5rem] shadow-sm relative ${
                               isOutgoing 
                                 ? 'bg-blue-600 text-white rounded-br-none shadow-blue-500/10' 
                                 : 'bg-white border border-slate-200 text-slate-900 rounded-bl-none shadow-slate-200/50'
                             }`}>
                                <p className="text-[13px] font-medium leading-relaxed tracking-tight">{msg.text}</p>
                                <p className={`text-[8px] font-black uppercase tracking-widest mt-2.5 opacity-60 ${isOutgoing ? 'text-white' : 'text-slate-400'}`}>
                                   {formatTime(msg.timestamp)}
                                </p>
                             </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>

                {/* Engagement Utility */}
                <footer className="p-6 bg-white border-t border-slate-100">
                  {quickReplies.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-4 mb-4 no-scrollbar">
                       {quickReplies.map((reply) => (
                         <button
                           key={reply._id}
                           onClick={() => useQuickReply(reply)}
                           className="whitespace-nowrap px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-white hover:text-blue-600 hover:border-blue-500/30 transition-all shrink-0"
                         >
                           {reply.title}
                         </button>
                       ))}
                    </div>
                  )}
                  
                  <div className="relative group">
                     <input
                       type="text"
                       placeholder="Construct engagement sequence..."
                       value={newMessage}
                       onChange={(e) => setNewMessage(e.target.value)}
                       onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                       className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] pl-8 pr-16 py-4 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100/50 transition-all"
                     />
                     <button
                       onClick={sendMessage}
                       disabled={!newMessage.trim() || !selectedChat}
                       className="absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-30"
                     >
                       <FiSend className="h-5 w-5" />
                     </button>
                  </div>
                </footer>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center opacity-30 select-none grayscale animate-pulse">
                 <div className="h-24 w-24 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center mb-8">
                    <FiInbox className="h-10 w-10 text-slate-300" />
                 </div>
                 <h2 className="text-xl font-black text-slate-400 uppercase tracking-[0.3em] text-center">Idle Mode</h2>
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default StaffChat;
