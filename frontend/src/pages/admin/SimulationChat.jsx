import { useEffect, useRef, useState } from 'react';
import { FiActivity, FiMessageCircle, FiPhone, FiRefreshCw, FiSend, FiUser } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const DEFAULT_PHONE = '919876543210';

const mapConversationMessages = (conversation) => {
  const msgs = (conversation?.messages || []);
  return msgs.map((message, index) => ({
    id: message._id || `${message.timestamp || message.createdAt || index}-${index}`,
    text: message.text || message.message || message.content || '',
    products: Array.isArray(message.products) ? message.products : [],
    type: message.type || 'text',
    sender: (message.sender || message.senderType || 'bot').toLowerCase(),
    timestamp: message.timestamp || message.createdAt || new Date().toISOString(),
  }));
};

const formatTime = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const SimulationChat = () => {
  const { user } = useAuth();
  const businessId = user?.businessId;
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const [phone, setPhone] = useState(DEFAULT_PHONE);
  const [draftPhone, setDraftPhone] = useState(DEFAULT_PHONE);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [session, setSession] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const loadHistory = async (targetPhone = phone, silent = false) => {
    const normalizedPhone = String(targetPhone || '').trim();
    if (!businessId || !normalizedPhone) return;

    if (!silent) {
      setIsLoadingHistory(true);
    }

    try {
      const response = await api.get('/public/chat/history', {
        params: {
          businessId,
          phone: normalizedPhone,
        },
      });

      setMessages(mapConversationMessages(response.data?.conversation));
      setSession(response.data?.session || null);
      setCustomer(response.data?.customer || null);
      setError('');
    } catch (fetchError) {
      console.error('Failed to load simulator history:', fetchError);
      setMessages([]);
      setSession(null);
      setCustomer(null);
      setError(fetchError.response?.data?.message || 'Failed to load conversation history.');
    } finally {
      if (!silent) {
        setIsLoadingHistory(false);
      }
    }
  };

  useEffect(() => {
    loadHistory(DEFAULT_PHONE);
  }, [businessId]);

  useEffect(() => {
    if (!phone || !businessId) return undefined;

    const interval = setInterval(() => {
      loadHistory(phone, true);
    }, 5000);

    return () => clearInterval(interval);
  }, [phone, businessId]);

  useEffect(() => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isSending]);

  const handleLoadPhone = async (event) => {
    event.preventDefault();
    const normalizedPhone = String(draftPhone || '').trim();
    if (!normalizedPhone) return;

    setPhone(normalizedPhone);
    await loadHistory(normalizedPhone);
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    const currentPhone = String(phone || '').trim();
    const message = String(inputMessage || '').trim();

    if (!businessId || !currentPhone || !message || isSending) return;

    // 1. Optimistic Update for User Message
    const userMsgId = `temp-${Date.now()}`;
    const userMsg = {
      id: userMsgId,
      text: message,
      sender: 'customer',
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsSending(true);
    setError('');
    setInputMessage(''); 

    try {
      const response = await api.post('/public/chat/message', {
        businessId,
        phone: currentPhone,
        message,
      });

      // 2. Direct Bot Response from API
      if (response.data) {
        const botMsg = {
          id: `bot-${Date.now()}`,
          text: response.data.response || response.data.text || '...',
          products: Array.isArray(response.data.products) ? response.data.products : [],
          type: response.data.type || 'text',
          sender: 'bot',
          timestamp: new Date().toISOString(),
          isNew: true
        };
        setMessages(prev => [...prev, botMsg]);
        
        // Update session info if returned
        if (response.data.session) {
          setSession(response.data.session);
        }
      }

      // 3. Background sync to get full history and DB IDs
      setTimeout(() => loadHistory(currentPhone, true), 1500);
    } catch (sendError) {
      console.error('Failed to send simulator message:', sendError);
      setError(sendError.response?.data?.message || 'Message delivery failed.');
      // Remove the failed optimistic message
      setMessages(prev => prev.filter(m => m.id !== userMsgId));
      setInputMessage(message); 
    } finally {
      setIsSending(false);
    }
  };

  const currentStep = session?.currentStep || 'start';
  const collectedData = session?.collectedData || {};

  return (
    <div className="flex h-full w-full overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-white shadow-2xl shadow-slate-200/50">
      {/* Sidebar - Simulator Controls */}
      <aside className="hidden w-[380px] flex-col border-r border-slate-100 bg-slate-50/50 lg:flex">
        <div className="p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-[#25d366] to-[#128c7e] text-white shadow-lg shadow-emerald-500/20">
              <FiMessageCircle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-base font-black uppercase tracking-[0.15em] text-slate-900">Sandbox</h1>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></span>
                <p className="text-[11px] font-bold text-slate-500">Live Simulation Engine</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleLoadPhone} className="mt-10 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Target Phone Number
              </label>
              <div className="group relative">
                <FiPhone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#25d366]" />
                <input
                  type="text"
                  value={draftPhone}
                  onChange={(event) => setDraftPhone(event.target.value)}
                  placeholder="e.g. 919876543210"
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#25d366] focus:ring-4 focus:ring-emerald-500/5"
                />
              </div>
            </div>
            
            <button
              type="submit"
              className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-slate-900 text-[11px] font-black uppercase tracking-[0.25em] text-white transition-all hover:bg-slate-800 hover:shadow-lg active:scale-[0.98]"
            >
              <FiRefreshCw className={`h-4 w-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
              Load Interaction
            </button>
          </form>
        </div>

        <div className="mt-auto p-8">
          <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Session Intelligence</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Current Step</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#128c7e]">
                  {currentStep}
                </span>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500">Collected Data</span>
                <div className="max-h-[300px] overflow-auto rounded-xl bg-slate-50 p-4 font-mono text-[10px] text-slate-600 border border-slate-100 custom-scrollbar">
                  {Object.keys(collectedData).length > 0 ? (
                    <pre className="whitespace-pre-wrap">{JSON.stringify(collectedData, null, 2)}</pre>
                  ) : (
                    <span className="italic text-slate-400">No data collected yet</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-amber-50/50 p-3 border border-amber-100/50">
                <FiUser className="h-4 w-4 text-amber-600" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Customer ID</span>
                  <span className="text-[10px] font-bold text-amber-600 truncate max-w-[180px]">
                    {session?.customerId || 'Pending registration...'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Interface */}
      <section className="relative flex flex-1 flex-col bg-[#efeae2]">
        {/* WhatsApp Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.4] pointer-events-none"
          style={{ 
            backgroundImage: `url("/images/whatsapp-bg.png")`,
            backgroundSize: '400px',
            mixBlendMode: 'multiply'
          }}
        />

        {/* Chat Header */}
        <header className="relative z-10 flex h-20 items-center justify-between bg-[#f0f2f5] px-8 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm border border-slate-200">
                <FiUser className="h-6 w-6" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#f0f2f5] bg-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">{customer?.name || 'Simulator User'}</p>
              <p className="text-[11px] font-bold text-emerald-600 tracking-wide">Online</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadHistory(phone)}
              className="flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-600 shadow-sm transition-all hover:bg-slate-50 border border-slate-200"
            >
              <FiRefreshCw className={`h-3.5 w-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </header>

        {/* Messages Container */}
        <div 
          ref={chatContainerRef}
          className="relative z-10 flex-1 overflow-y-auto px-6 py-8 md:px-12 lg:px-20 no-scrollbar"
        >
          <div className="mx-auto max-w-4xl space-y-6">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-20 text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/50 backdrop-blur shadow-sm">
                  <FiMessageCircle className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">No Messages Found</h3>
                <p className="mt-2 text-xs font-bold text-slate-500 max-w-[280px]">
                  Start the conversation by sending a message as the customer.
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const isCustomer = message.sender === 'customer';
                return (
                  <div 
                    key={message.id} 
                    className={`flex animate-in fade-in slide-in-from-bottom-2 duration-300 ${isCustomer ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`relative max-w-[85%] px-4 py-3 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] ${
                        isCustomer 
                          ? 'rounded-l-2xl rounded-tr-2xl bg-[#d9fdd3] text-slate-800' 
                          : 'rounded-r-2xl rounded-tl-2xl bg-white text-slate-800'
                      }`}
                    >
                      {/* Message Tail simulation */}
                      <div className={`absolute top-0 h-3 w-3 ${
                        isCustomer 
                          ? '-right-2 bg-[#d9fdd3] [clip-path:polygon(0_0,0_100%,100%_0)]' 
                          : '-left-2 bg-white [clip-path:polygon(100%_0,100%_100%,0_0)]'
                      }`} />

                      <p className="whitespace-pre-wrap text-[13.5px] leading-[1.4] font-medium">
                        {message.text}
                      </p>

                      {!isCustomer && Array.isArray(message.products) && message.products.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {message.products.map((product, index) => {
                            const displayPrice = Number(product.offerPrice || product.price || product.mrp || 0);
                            return (
                              <div
                                key={product.id || product._id || `${message.id}-product-${index}`}
                                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-[12px] font-black text-slate-900">
                                      {index + 1}. {product.name || 'Unnamed Product'}
                                    </p>
                                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                      {product.category || 'General'}{product.unitType ? ` • ${product.unitType}` : ''}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[12px] font-black text-emerald-600">
                                      Rs {displayPrice.toFixed(2)}
                                    </p>
                                    {product.mrp && product.offerPrice && Number(product.mrp) !== Number(product.offerPrice) && (
                                      <p className="text-[10px] font-bold text-slate-400 line-through">
                                        Rs {Number(product.mrp).toFixed(2)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      <div className="mt-1.5 flex items-center justify-end gap-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400/80">
                          {formatTime(message.timestamp)}
                        </span>
                        {isCustomer && (
                          <div className="flex">
                            <span className="text-[#53bdeb] text-[10px]">✓✓</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {isSending && (
              <div className="flex justify-start animate-in fade-in duration-300">
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm border border-slate-100">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Chat Input */}
        <div className="relative z-10 bg-[#f0f2f5] px-6 py-5 lg:px-12">
          {error && (
            <div className="mb-4 animate-in slide-in-from-bottom-2 rounded-xl bg-rose-50 p-3 text-[11px] font-bold text-rose-600 border border-rose-100 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white text-[10px]">!</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="mx-auto flex max-w-4xl items-center gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputMessage}
                onChange={(event) => setInputMessage(event.target.value)}
                placeholder="Type your message..."
                disabled={isSending}
                className="h-14 w-full rounded-2xl border-none bg-white px-6 text-[14px] font-medium text-slate-700 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-[#25d366]/20 disabled:opacity-70"
              />
            </div>
            <button
              type="submit"
              disabled={!inputMessage.trim() || isSending}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 hover:bg-[#20bd5c] active:scale-95 disabled:scale-100 disabled:bg-slate-300 disabled:shadow-none"
            >
              <FiSend className="h-5 w-5" />
            </button>
          </form>
          <p className="mt-3 text-center text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
            Messages are processed via /api/public/chat/message
          </p>
        </div>
      </section>
    </div>
  );
};

export default SimulationChat;
