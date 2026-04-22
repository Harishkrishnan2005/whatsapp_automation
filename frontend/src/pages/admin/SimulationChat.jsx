import { useState, useEffect, useRef } from 'react';
import { FiSend, FiUser, FiClock, FiInbox, FiMessageCircle, FiSearch, FiCpu, FiActivity, FiTerminal } from 'react-icons/fi';
import api from '../../utils/api';

const SimulationChat = () => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [chatMode, setChatMode] = useState('SIMULATOR'); // SIMULATOR | MANUAL
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchChats(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval;
    if (selectedChat) {
      fetchMessages(selectedChat.phone, true);
      // Poll for new messages every 5 seconds when a chat is selected
      interval = setInterval(() => {
        fetchMessages(selectedChat.phone, true);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChats = async (isPolling = false) => {
    if (!isPolling) setLoadingChats(true);
    try {
      const response = await api.get('/conversations');
      setChats(response.data?.conversations || response.data || []);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      if (!isPolling) setLoadingChats(false);
    }
  };

  const fetchMessages = async (phone, isPolling = false) => {
    if (!isPolling) setLoadingMessages(true);
    try {
      const normalizedPhone = String(phone || '').trim();
      if (!normalizedPhone) return;

      const response = await api.get(`/conversations/${encodeURIComponent(normalizedPhone)}`);
      const conversation = response.data;

      if (conversation) {
        const mappedMessages = (conversation.messages || []).map(m => ({
          message: m.text,
          senderType: m.sender,
          createdAt: m.timestamp,
          type: m.sender === 'customer' ? 'incoming' : 'outgoing'
        }));
        
        setMessages(mappedMessages);
      }
    } catch (error) {
      console.error('Failed to update messages:', error);
    } finally {
      if (!isPolling) setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedChat) return;

    const messageText = inputMessage;
    setInputMessage('');

    if (chatMode === 'SIMULATOR') {
      // SIMULATE CUSTOMER (Existing behavior)
      const userMsg = {
        message: messageText,
        type: 'incoming',
        senderType: 'customer',
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMsg]);

      try {
        setIsBotTyping(true);
        const response = await api.post('/chatbot/send', {
          phone: selectedChat.phone,
          message: messageText
        });

        const botMsg = {
          message: response.data.response || response.data.text,
          type: 'outgoing',
          senderType: 'bot',
          messageType: response.data.type || 'text',
          products: response.data.products || [],
          createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, botMsg]);
      } catch (error) {
        console.error('Simulation error:', error);
      } finally {
        setIsBotTyping(false);
        fetchChats(); // Refresh chat list to show latest message
      }
    } else {
        // MANUAL REPLY AS ADMIN
      try {
        const response = await api.post('/chat/send', {
          phone: selectedChat.phone,
          message: messageText
        });

        const adminMsg = {
          ...response.data,
          type: 'outgoing',
          senderType: 'admin'
        };
        setMessages(prev => [...prev, adminMsg]);
        fetchChats(); // Refresh chat list to show latest message
      } catch (error) {
        console.error('Manual send error:', error);
      }
    }
  };

  const handleSimulateNewLead = async () => {
    const phone = prompt('Enter a phone number to simulate (e.g. 919876543210):');
    if (!phone) return;

    try {
      setIsBotTyping(true);
      // Sending 'hi' will initialize the customer and the first bot response
      const response = await api.post('/chatbot/send', {
        phone,
        message: 'hi'
      });
      
      await fetchChats();
      if (phone === selectedChat?.phone) {
        await fetchMessages(phone, true);
      }
      alert('Simulation thread initialized for ' + phone);
    } catch (error) {
      console.error('Failed to simulate new lead:', error);
      alert('Failed to initialize simulation');
    } finally {
      setIsBotTyping(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const sendStructuredReply = async (option) => {
    if (!selectedChat) return;

    const outgoing = {
      message: option.name,
      type: 'incoming',
      senderType: 'customer',
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, outgoing]);

    try {
      setIsBotTyping(true);
      const response = await api.post('/chatbot/send', {
        phone: selectedChat.phone,
        message: {
          label: option.name,
          action: option.action || (option.id === 'cod' || option.id === 'online' ? 'SAVE_PAYMENT_METHOD' : undefined)
        }
      });

      const botMsg = {
        message: response.data.response || response.data.text,
        type: 'outgoing',
        senderType: 'bot',
        messageType: response.data.type || 'text',
        products: response.data.products || [],
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error('Simulation quick reply error:', error);
    } finally {
      setIsBotTyping(false);
      fetchChats();
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-slate-50">
      {/* LEFT PANEL - Chat list */}
      <aside className="w-[30%] bg-white border-r border-slate-200 flex flex-col min-w-[320px]">
        <div className="p-6 border-b border-slate-100 bg-white">
           <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                 <FiMessageCircle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Conversations</h2>
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tighter">
                  {chatMode === 'SIMULATOR' ? 'Bot Simulator Active' : 'Live Management Active'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={handleSimulateNewLead}
                  className="p-2 rounded-xl hover:bg-blue-50 text-blue-600 transition-all"
                  title="Simulate New Lead"
                >
                  <FiSend className="h-4 w-4" />
                </button>
                <button 
                  onClick={fetchChats}
                  className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 transition-all"
                  title="Refresh Conversations"
                >
                  <FiActivity className={`h-4 w-4 ${loadingChats ? 'animate-spin' : ''}`} />
                </button>
              </div>
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loadingChats ? (
            <div className="p-10 text-center opacity-40 animate-pulse">
               <FiActivity className="h-8 w-8 mx-auto mb-2 text-blue-600" />
               <p className="text-[10px] font-black uppercase tracking-widest">Scanning Registry...</p>
            </div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-20">
              <FiInbox className="h-12 w-12 mb-4" />
              <p className="font-bold text-xs uppercase tracking-widest">No Interaction History</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {chats.map((chat) => (
                <div
                  key={chat._id}
                  onClick={() => setSelectedChat(chat)}
                  className={`px-6 py-4 cursor-pointer transition-all border-l-4 ${
                    selectedChat?._id === chat._id
                      ? 'bg-blue-50/50 border-blue-600'
                      : 'hover:bg-slate-50 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl flex-shrink-0 bg-white border border-slate-100 shadow-sm flex items-center justify-center font-black text-slate-400 text-sm">
                      {chat.name ? chat.name[0].toUpperCase() : chat.phone.slice(-2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-sm text-slate-900 truncate capitalize">
                          {chat.name || chat.phone}
                        </h4>
                        <span className="text-[9px] font-black text-slate-300 uppercase">
                          {formatTime(chat.updatedAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-1 font-medium">
                        {chat.messages && chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].text : 'No messages yet'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* RIGHT PANEL - Chat window */}
      <main className="w-[70%] flex flex-col relative bg-white">
        {selectedChat ? (
          <>
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-xs border border-blue-100">
                  {selectedChat.name ? selectedChat.name[0].toUpperCase() : '?'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 leading-none capitalize">{selectedChat.name || 'Anonymous Session'}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       {selectedChat.phone} • {chatMode === 'SIMULATOR' ? 'Virtual User' : 'Live Customer'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl">
                <button
                  onClick={() => setChatMode('SIMULATOR')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    chatMode === 'SIMULATOR' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <FiCpu className="inline mr-2" /> Simulator
                </button>
                <button
                  onClick={() => setChatMode('MANUAL')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    chatMode === 'MANUAL' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <FiUser className="inline mr-2" /> Live Reply
                </button>
              </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-12 py-8 space-y-6 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-20">
                   <FiTerminal className="h-12 w-12 mb-4" />
                   <div className="h-px w-20 bg-slate-900 mb-4" />
                   <p className="text-[10px] font-black uppercase tracking-[0.3em]">Initialize Simulation</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isBot = msg.senderType === 'bot' || msg.senderType === 'chatbot';
                  const isStaff = msg.senderType === 'staff' || msg.senderType === 'admin';
                  const isCustomer = msg.type === 'incoming' || msg.senderType === 'customer';

                  return (
                    <div
                      key={index}
                      className={`flex w-full ${isCustomer ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] group`}>
                         <div className={`flex items-center gap-2 mb-2 ${isCustomer ? 'flex-row-reverse' : ''}`}>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                               {isBot ? 'Bot Engine' : isStaff ? 'Admin (You)' : 'Customer'}
                            </span>
                            <span className="text-[9px] text-slate-300">{formatTime(msg.createdAt)}</span>
                         </div>
                         <div
                           className={`px-5 py-4 rounded-[2rem] shadow-sm relative ${
                             isCustomer
                               ? 'bg-slate-900 text-white rounded-tr-none'
                               : isStaff
                               ? 'bg-emerald-600 text-white rounded-tl-none shadow-emerald-200/50'
                               : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none shadow-slate-200/50'
                           }`}
                         >
                            <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                            
                            {/* Products Rendering if any */}
                            {msg.messageType === 'quick_reply' && msg.products && msg.products.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {msg.products.map((option, idx) => (
                                  <button
                                    key={option.id || option.name || idx}
                                    onClick={() => sendStructuredReply(option)}
                                    className="rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-blue-700"
                                  >
                                    {option.name}
                                  </button>
                                ))}
                              </div>
                            )}

                            {msg.products && msg.products.length > 0 && msg.messageType !== 'quick_reply' && (
                              <div className="mt-4 grid grid-cols-2 gap-2">
                                {msg.products.map(p => (
                                  <div key={p._id} className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="aspect-square bg-white rounded-lg mb-2 overflow-hidden">
                                      {p.images && p.images[0] && <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />}
                                    </div>
                                    <p className="text-[10px] font-black text-slate-900 truncate">{p.name}</p>
                                    <p className="text-[9px] font-bold text-blue-600 mt-1">₹{p.price}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                         </div>
                      </div>
                    </div>
                  )
                })
              )}
              {isBotTyping && (
                <div className="flex justify-start">
                   <div className="bg-slate-100 px-4 py-3 rounded-full flex gap-1">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                   </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-8 bg-white border-t border-slate-100">
               <form 
                 onSubmit={handleSendMessage}
                 className="relative flex items-center"
               >
                 <input
                   type="text"
                   disabled={isBotTyping}
                   placeholder={
                     chatMode === 'SIMULATOR' 
                       ? (isBotTyping ? "Neural engine processing..." : "Simulate Customer message (e.g. 'hi', '1')")
                       : "Reply manually as Admin..."
                   }
                   value={inputMessage}
                   onChange={(e) => setInputMessage(e.target.value)}
                   className={`w-full h-16 bg-slate-50 rounded-3xl px-8 pr-20 text-sm font-bold text-slate-700 outline-none focus:ring-4 transition-all border-none ${
                     chatMode === 'SIMULATOR' ? 'focus:ring-blue-500/10' : 'focus:ring-emerald-500/10'
                   }`}
                 />
                 <button
                   type="submit"
                   disabled={!inputMessage.trim() || isBotTyping}
                   className={`absolute right-2 h-12 w-12 rounded-2xl flex items-center justify-center transition-all shadow-xl ${
                     inputMessage.trim() && !isBotTyping 
                       ? (chatMode === 'SIMULATOR' ? 'bg-blue-600 text-white shadow-blue-500/30' : 'bg-emerald-600 text-white shadow-emerald-500/30') 
                       : 'bg-slate-200 text-slate-400 shadow-none'
                   }`}
                 >
                   <FiSend className="h-5 w-5" />
                 </button>
               </form>
               <p className="mt-4 text-center text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] px-10">
                 {chatMode === 'SIMULATOR' 
                   ? "Simulator Mode: You are acting as the customer. Messages trigger automated bot responses."
                   : "Live Mode: You are acting as the Business. Messages are sent directly to the customer history."}
               </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-20 bg-slate-50/50">
            <div className="h-32 w-32 rounded-[2.5rem] bg-white shadow-2xl flex items-center justify-center mb-10 overflow-hidden border border-slate-100">
               <FiTerminal className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-4 italic">Neural Core Simulation</h2>
            <p className="max-w-[420px] text-xs text-slate-400 leading-relaxed font-bold uppercase tracking-wide">
               Select a customer contact to initialize the simulation pipeline. You can test flows, keyword matching, and automated actions in an end-to-end sandbox.
            </p>
            
            <button 
              onClick={handleSimulateNewLead}
              className="mt-8 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-3"
            >
              <FiSend className="h-4 w-4" /> Initialize New Simulation
            </button>

            <div className="mt-20 flex items-center gap-3 opacity-20">
               <div className="h-px w-10 bg-slate-400" />
               <span className="text-[10px] font-black uppercase tracking-[0.5em]">Sandbox Active</span>
               <div className="h-px w-10 bg-slate-400" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SimulationChat;
