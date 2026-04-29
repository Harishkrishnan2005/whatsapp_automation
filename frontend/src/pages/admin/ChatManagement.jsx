import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageCircle, FiSearch, FiUser, FiClock, FiCheckSquare, FiSend, FiInbox } from 'react-icons/fi';
import useInterval from '../../hooks/useInterval';
import api from '../../utils/api';

const ChatManagement = () => {
  const [chats, setChats] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageRefresh, setMessageRefresh] = useState(0);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messagesPage, setMessagesPage] = useState(1);
  const [staffMembers, setStaffMembers] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');

  useEffect(() => {
    fetchChats();
    fetchStaffMembers();
  }, [page, searchQuery]);

  useInterval(() => {
    fetchChats();
    if (selectedCustomer) {
      fetchMessages();
      markConversationAsRead(selectedCustomer._id);
    }
  }, 10000);

  useEffect(() => {
    if (selectedCustomer?._id) {
      fetchMessages();
      markConversationAsRead(selectedCustomer._id);
    }
  }, [selectedCustomer?._id, messageRefresh, messagesPage]);

  const fetchChats = async () => {
    setLoading(true);
    try {
      let response;
      if (searchQuery.trim()) {
        response = await api.get(`/chat-management/search?q=${searchQuery}`);
        setChats(response.data);
      } else {
        response = await api.get(`/chat-management?page=${page}&limit=20`);
        setChats(response.data.chats);
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await api.get(
        `/chat-management/${selectedCustomer._id}/messages?page=${messagesPage}&limit=50`
      );
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const fetchStaffMembers = async () => {
    try {
      const response = await api.get('/admin/staff');
      setStaffMembers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch staff members:', error);
      setStaffMembers([]);
    }
  };

  const markConversationAsRead = async (customerId) => {
    if (!customerId) return;
    try {
      await api.put(`/chat-management/${customerId}/read`);
      setChats((prev) =>
        prev.map((chat) => (
          chat._id === customerId
            ? { ...chat, unreadCount: 0 }
            : chat
        ))
      );
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setPage(1);
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setMessagesPage(1);
    setSelectedStaffId(customer?.assignedTo || '');
    markConversationAsRead(customer._id);
  };

  const handleAssignChat = async () => {
    if (!selectedCustomer?._id || !selectedStaffId) return;
    setAssigning(true);
    try {
      await api.post('/assign', {
        customerId: selectedCustomer._id,
        staffId: selectedStaffId,
      });
      fetchChats();
    } catch (error) {
      console.error('Failed to assign chat:', error);
    } finally {
      setAssigning(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedCustomer) return;

    setSendingMessage(true);
    try {
      await api.post('/chat-management/messages', {
        customerId: selectedCustomer._id,
        message: messageInput,
      });
      setMessageInput('');
      setMessageRefresh(messageRefresh + 1);
      fetchChats();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const totalUnreadCount = chats.reduce((sum, chat) => sum + Number(chat.unreadCount || 0), 0);

  return (
    <div className="space-y-10 animate-fade-in flex flex-col h-[calc(100vh-140px)] pb-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Conversation Hub</h1>
          <p className="mt-2 text-slate-500 font-medium tracking-tight">Monitoring multi-channel intelligence distribution and operative support logs.</p>
        </div>
        <div className="bg-white px-6 py-4 rounded-[1.5rem] border border-slate-200/60 shadow-sm flex items-center gap-4">
           <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse ring-4 ring-blue-500/10" />
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Global Backlog</p>
              <p className="text-sm font-black text-slate-900 mt-1 uppercase leading-none">{totalUnreadCount} Active Events</p>
           </div>
        </div>
      </header>

      <div className="flex gap-10 flex-1 min-h-0 overflow-hidden">
        {/* Contact Matrix */}
        <aside className="w-1/3 flex flex-col bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden max-w-[420px]">
          <div className="p-8 border-b border-slate-50 bg-slate-50/20">
            <div className="relative group">
               <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
               <input
                 type="text"
                 placeholder="Search transmission nodes..."
                 value={searchQuery}
                 onChange={handleSearch}
                 className="w-full pl-12 pr-5 py-4 rounded-2xl bg-white border border-slate-200 text-sm font-black text-slate-700 placeholder:text-slate-400 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all shadow-sm"
               />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
            <AnimatePresence mode="popLayout">
              {loading ? (
                <div className="flex flex-col items-center justify-center p-20 opacity-30">
                   <div className="h-8 w-8 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-4" />
                   <p className="text-[10px] font-black uppercase tracking-widest">Residuing...</p>
                </div>
              ) : chats.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 opacity-30">
                   <FiInbox className="h-12 w-12 mb-4" />
                   <p className="text-[10px] font-black uppercase tracking-widest italic">Zero Signal Found</p>
                </div>
              ) : (
                chats.map((chat) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={chat._id}
                    onClick={() => handleSelectCustomer(chat)}
                    className={`p-6 rounded-[2rem] cursor-pointer transition-all duration-500 flex items-center gap-5 relative group border-2 ${
                      selectedCustomer?._id === chat._id
                        ? 'bg-slate-900 border-slate-900 shadow-2xl shadow-slate-900/20'
                        : 'bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-100'
                    }`}
                  >
                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center font-black text-sm ring-4 ring-white shadow-xl transition-all duration-500 ${
                      selectedCustomer?._id === chat._id ? 'bg-white text-slate-900 scale-110' : 'bg-blue-600 text-white group-hover:bg-slate-900'
                    }`}>
                      {chat.name ? chat.name[0].toUpperCase() : '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-base font-black truncate leading-none uppercase tracking-tight ${selectedCustomer?._id === chat._id ? 'text-white' : 'text-slate-900'}`}>{chat.name}</p>
                        <p className={`text-[9px] font-black uppercase shrink-0 ${selectedCustomer?._id === chat._id ? 'text-slate-400' : 'text-slate-400 group-hover:text-slate-500'}`}>{formatTime(chat.lastMessageTime)}</p>
                      </div>
                      <p className={`text-xs mt-2 truncate font-medium ${selectedCustomer?._id === chat._id ? 'text-slate-300' : 'text-slate-500'}`}>{chat.lastMessage}</p>
                    </div>
                    {chat.unreadCount > 0 && selectedCustomer?._id !== chat._id && (
                      <div className="absolute top-4 right-4 h-5 w-5 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center animate-bounce shadow-lg shadow-blue-500/40">
                        {chat.unreadCount}
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
            <button
               onClick={() => setPage(p => Math.max(1, p - 1))}
               disabled={page === 1}
               className="btn-secondary h-12 flex-1 py-0 text-[10px] font-black uppercase tracking-widest disabled:opacity-30"
            >
               Previous Node
            </button>
            <button
               onClick={() => setPage(page + 1)}
               className="btn-primary h-12 flex-1 py-0 text-[10px] font-black uppercase tracking-widest shadow-none"
            >
               Next Node
            </button>
          </div>
        </aside>

        {/* Intelligence Stream */}
        <main className="flex-1 flex flex-col bg-white rounded-[3rem] border border-slate-200/60 shadow-sm overflow-hidden relative selection:bg-blue-100">
          <AnimatePresence mode="wait">
            {selectedCustomer ? (
              <motion.div 
                key={selectedCustomer._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col h-full"
              >
                <header className="px-10 py-8 border-b border-slate-100 bg-white sticky top-0 z-10 flex items-center justify-between backdrop-blur-md bg-white/90">
                  <div className="flex items-center gap-6">
                     <div className="h-16 w-16 rounded-[1.5rem] bg-slate-900 flex items-center justify-center text-white font-black text-xl shadow-2xl shadow-slate-900/20 ring-4 ring-white">
                        {selectedCustomer.name ? selectedCustomer.name[0].toUpperCase() : '?'}
                     </div>
                     <div>
                        <h2 className="text-2xl font-black text-slate-900 leading-none tracking-tighter uppercase">{selectedCustomer.name}</h2>
                        <div className="flex items-center gap-3 mt-3">
                           <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100/50">{selectedCustomer.phone}</p>
                           <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                           <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active Node</span>
                        </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                     <select
                       value={selectedStaffId}
                       onChange={(e) => setSelectedStaffId(e.target.value)}
                       className="bg-white border-slate-200 rounded-xl px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 transition-all cursor-pointer border"
                     >
                       <option value="">NODE: UNALLOCATED</option>
                       {staffMembers.map((s) => (
                         <option key={s._id} value={s._id}>{s.name.toUpperCase()}</option>
                       ))}
                     </select>
                     <button
                       onClick={handleAssignChat}
                       disabled={!selectedStaffId || assigning}
                       className="btn-primary py-3 px-8 text-[10px] font-black uppercase tracking-widest shadow-none h-auto"
                     >
                       {assigning ? 'Syncing...' : 'Assign Specialist'}
                     </button>
                  </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-8 bg-slate-50/20">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-10 grayscale select-none">
                      <FiInbox className="h-32 w-32 mb-6" />
                      <p className="font-black uppercase tracking-[0.4em] text-sm">Historical Buffer Empty</p>
                    </div>
                  ) : (
                    messages.map((msg, index) => (
                      <div key={index} className={`flex ${msg.type === 'incoming' ? 'justify-start' : 'justify-end'}`}>
                         <div className={`max-w-[75%] ${msg.type === 'incoming' ? 'pr-20' : 'pl-20'}`}>
                            <motion.div 
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ delay: index * 0.05 }}
                              className={`px-8 py-6 rounded-[2.5rem] shadow-xl border relative ${
                                msg.type === 'incoming' 
                                  ? 'bg-white border-slate-200/60 rounded-bl-none text-slate-900 shadow-slate-200/40' 
                                  : 'bg-slate-900 border-slate-900 rounded-br-none text-white shadow-slate-900/10'
                              }`}
                            >
                               <p className="text-base font-medium leading-relaxed tracking-tight">{msg.message}</p>
                               <div className="flex items-center justify-between mt-4">
                                  <p className={`text-[9px] font-black uppercase tracking-widest lg:opacity-60 ${msg.type === 'incoming' ? 'text-slate-400' : 'text-slate-400 text-blue-200/60'}`}>
                                     {formatTime(msg.createdAt)}
                                  </p>
                                  {msg.type !== 'incoming' && (
                                    <div className="flex items-center gap-1">
                                       <FiCheckSquare className="h-3 w-3 text-blue-400" />
                                       <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Delivered</span>
                                    </div>
                                  )}
                               </div>
                            </motion.div>
                         </div>
                      </div>
                    ))
                  )}
                </div>

                <footer className="p-8 border-t border-slate-100 bg-white">
                   <div className="flex gap-4 p-2 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner focus-within:bg-white focus-within:shadow-2xl focus-within:shadow-slate-200/50 transition-all duration-500">
                      <input
                        type="text"
                        placeholder="Construct tactical response..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1 px-8 py-3 bg-transparent text-base font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-black placeholder:uppercase placeholder:text-[10px] placeholder:tracking-widest outline-none"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim() || sendingMessage}
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
                    <FiMessageCircle className="h-12 w-12 text-slate-300" />
                 </div>
                 <h2 className="text-2xl font-black text-slate-300 uppercase tracking-[0.2em] text-center">Select Intelligence Node<br/><span className="text-sm font-black lowercase opacity-40">Awaiting engagement cycle...</span></h2>
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default ChatManagement;
