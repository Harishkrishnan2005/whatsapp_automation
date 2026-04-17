import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageSquare, FiSend, FiXCircle, FiInbox, FiClock, FiZap } from 'react-icons/fi';
import api from '../../utils/api';

const StaffChat = () => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [quickReplies, setQuickReplies] = useState([]);
  const [page, setPage] = useState(1);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    fetchChats();
    fetchQuickReplies();
  }, [page]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages();
    }
  }, [selectedChat]);

  const fetchChats = async () => {
    try {
      const response = await api.get(`/staff/chats?page=${page}&limit=10`);
      setChats(response.data.chats || []);
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
      const customerId = selectedChat.customerId?._id || selectedChat.customerId;
      const response = await api.get(`/chat-management/${customerId}/messages?page=1&limit=50`);
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
      const customerId = selectedChat.customerId?._id || selectedChat.customerId;
      await api.post('/chat-management/messages', { customerId, message: newMessage });
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
      await api.put(`/chats/${selectedChat._id}/close`, {});
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
    <div className="space-y-10 animate-fade-in flex flex-col h-[calc(100vh-140px)] pb-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Specialist Inbox</h1>
          <p className="mt-2 text-slate-500 font-medium tracking-tight">Active transmission management and real-time customer engagement.</p>
        </div>
        <div className="bg-white px-6 py-4 rounded-[1.5rem] border border-slate-200/60 shadow-sm flex items-center gap-4">
           <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse ring-4 ring-blue-500/10" />
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Queue Status</p>
              <p className="text-sm font-black text-slate-900 mt-1 uppercase leading-none">{chats.length} Assigned Nodes</p>
           </div>
        </div>
      </header>

      <div className="flex gap-10 flex-1 min-h-0 overflow-hidden">
        {/* Contact Matrix */}
        <aside className="w-1/3 flex flex-col bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden max-w-[420px]">
          <div className="p-8 border-b border-slate-50 bg-slate-50/20">
             <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Assigned Channels</h2>
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
                  className={`p-6 rounded-[2rem] cursor-pointer transition-all duration-500 flex items-center gap-5 relative group border-2 ${
                    selectedChat?._id === chat._id
                      ? 'bg-slate-900 border-slate-900 shadow-2xl shadow-slate-900/20'
                      : 'bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-100'
                  }`}
                >
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center font-black text-sm ring-4 ring-white shadow-xl transition-all duration-500 ${
                    selectedChat?._id === chat._id ? 'bg-white text-slate-900 scale-110' : 'bg-blue-600 text-white group-hover:bg-slate-900'
                  }`}>
                    {chat.customerId?.name ? chat.customerId.name[0].toUpperCase() : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-base font-black truncate leading-none uppercase tracking-tight ${selectedChat?._id === chat._id ? 'text-white' : 'text-slate-900'}`}>{chat.customerId?.name}</p>
                    <p className={`text-[10px] font-black mt-2 uppercase tracking-widest ${selectedChat?._id === chat._id ? 'text-slate-400' : 'text-slate-400'}`}>{chat.customerId?.phone}</p>
                    <div className="mt-3 flex items-center gap-2">
                       <div className={`h-1.5 w-1.5 rounded-full ${chat.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                       <span className={`text-[8px] font-black uppercase tracking-widest ${selectedChat?._id === chat._id ? 'text-blue-200/60' : 'text-slate-400'}`}>{chat.status}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
              {chats.length === 0 && (
                <div className="flex flex-col items-center justify-center p-20 opacity-30 select-none grayscale">
                   <FiInbox className="h-12 w-12 mb-4" />
                   <p className="text-[10px] font-black uppercase tracking-widest italic text-center">No Signals Assigned</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
            <button
               onClick={() => setPage(p => Math.max(1, p - 1))}
               disabled={page === 1}
               className="btn-secondary h-12 flex-1 py-0 text-[10px] font-black uppercase tracking-widest disabled:opacity-30"
            >
               Previous
            </button>
            <button
               onClick={() => setPage(page + 1)}
               className="btn-primary h-12 flex-1 py-0 text-[10px] font-black uppercase tracking-widest shadow-none"
            >
               Next
            </button>
          </div>
        </aside>

        {/* Intelligence Stream */}
        <main className="flex-1 flex flex-col bg-white rounded-[3rem] border border-slate-200/60 shadow-sm overflow-hidden relative selection:bg-blue-100">
          <AnimatePresence mode="wait">
            {selectedChat ? (
              <motion.div 
                key={selectedChat._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col h-full"
              >
                <header className="px-10 py-8 border-b border-slate-100 bg-white sticky top-0 z-10 flex items-center justify-between backdrop-blur-md bg-white/90">
                  <div className="flex items-center gap-6">
                     <div className="h-16 w-16 rounded-[1.5rem] bg-slate-900 flex items-center justify-center text-white font-black text-xl shadow-2xl shadow-slate-900/20 ring-4 ring-white">
                        {selectedChat.customerId?.name ? selectedChat.customerId.name[0].toUpperCase() : '?'}
                     </div>
                     <div>
                        <h2 className="text-2xl font-black text-slate-900 leading-none tracking-tighter uppercase">{selectedChat.customerId?.name}</h2>
                        <div className="flex items-center gap-3 mt-3">
                           <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100/50">{selectedChat.customerId?.phone}</p>
                           <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                           <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active Node</span>
                        </div>
                     </div>
                  </div>
                  <button
                    onClick={closeChat}
                    className="btn-secondary py-3 px-8 text-[10px] font-black uppercase tracking-widest border-rose-100 text-rose-600 hover:bg-rose-500 hover:text-white transition-all h-auto gap-2 flex items-center"
                  >
                    <FiXCircle className="h-4 w-4" />
                    Archive Transmission
                  </button>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-8 bg-slate-50/20">
                  {loadingMessages ? (
                    <div className="flex flex-col items-center justify-center p-20 opacity-30">
                       <div className="h-8 w-8 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-4" />
                       <p className="text-[10px] font-black uppercase tracking-widest">Retrieving Log...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-10 grayscale select-none">
                      <FiInbox className="h-32 w-32 mb-6" />
                      <p className="font-black uppercase tracking-[0.4em] text-sm">Historical Buffer Empty</p>
                    </div>
                  ) : (
                    messages.map((msg, index) => (
                      <div key={index} className={`flex ${msg.type === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                         <div className={`max-w-[75%] ${msg.type === 'outgoing' ? 'pl-20' : 'pr-20'}`}>
                            <motion.div 
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ delay: index * 0.05 }}
                              className={`px-8 py-6 rounded-[2.5rem] shadow-xl border relative ${
                                msg.type === 'outgoing' 
                                  ? 'bg-slate-900 border-slate-900 rounded-br-none text-white shadow-slate-900/10' 
                                  : 'bg-white border-slate-200/60 rounded-bl-none text-slate-900 shadow-slate-200/40'
                              }`}
                            >
                               <p className="text-base font-medium leading-relaxed tracking-tight">{msg.message}</p>
                               <div className="flex items-center justify-between mt-4">
                                  <p className={`text-[9px] font-black uppercase tracking-widest lg:opacity-60 ${msg.type === 'outgoing' ? 'text-blue-200/60' : 'text-slate-400'}`}>
                                     {formatTime(msg.createdAt)}
                                  </p>
                                  {msg.type === 'outgoing' && (
                                    <div className="flex items-center gap-1">
                                       <FiZap className="h-3 w-3 text-blue-400" />
                                       <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Sent</span>
                                    </div>
                                  )}
                               </div>
                            </motion.div>
                         </div>
                      </div>
                    ))
                  )}
                </div>

                {quickReplies.length > 0 && (
                  <div className="px-10 py-6 border-t border-slate-100 bg-white/50 backdrop-blur-md">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Tactical Quick Replies</p>
                    <div className="flex flex-wrap gap-3">
                      {quickReplies.map((reply) => (
                        <button
                          key={reply._id}
                          onClick={() => useQuickReply(reply)}
                          className="bg-slate-50 hover:bg-white hover:shadow-lg border border-slate-200/60 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:border-blue-500/30"
                        >
                          {reply.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <footer className="p-8 border-t border-slate-100 bg-white">
                   <div className="flex gap-4 p-2 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner focus-within:bg-white focus-within:shadow-2xl focus-within:shadow-slate-200/50 transition-all duration-500">
                      <input
                        type="text"
                        placeholder="Construct tactical response..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        className="flex-1 px-8 py-3 bg-transparent text-base font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-black placeholder:uppercase placeholder:text-[10px] placeholder:tracking-widest outline-none"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || !selectedChat}
                        className="h-14 w-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale shrink-0"
                      >
                        <FiSend className="h-6 w-6" />
                      </button>
                   </div>
                </footer>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center opacity-30 select-none grayscale">
                 <div className="h-32 w-32 rounded-full border-4 border-dashed border-slate-200 flex items-center justify-center mb-10">
                    <FiMessageSquare className="h-12 w-12 text-slate-300" />
                 </div>
                 <h2 className="text-2xl font-black text-slate-300 uppercase tracking-[0.2em] text-center">Select Transmission Node<br/><span className="text-sm font-black lowercase opacity-40">Awaiting engagement cycle...</span></h2>
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default StaffChat;
