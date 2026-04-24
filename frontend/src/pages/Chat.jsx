import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiMessageCircle, 
  FiSend, 
  FiSearch, 
  FiMoreVertical, 
  FiUser, 
  FiInfo, 
  FiPhone, 
  FiVideo, 
  FiPaperclip, 
  FiSmile,
  FiClock,
  FiCheck,
  FiCheckCircle,
  FiX
} from 'react-icons/fi';
import api from '../utils/api';
import socket from '../utils/socket';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/ui/Badge';

const Chat = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState({}); // conversationId -> { userId, isTyping }
  const chatContainerRef = useRef(null);

  // Initialize Socket Connection
  useEffect(() => {
    if (user) {
      socket.connect(user.id || user._id);
      
      // Listen for global chat list updates
      socket.on('chat_list_update', (data) => {
        fetchConversations();
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [user]);

  // Fetch Conversations
  const fetchConversations = async (query = '') => {
    try {
      const response = await api.get(`/conversations?q=${query}`);
      setConversations(response.data.conversations || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations(searchQuery);
  }, [searchQuery]);

  // Handle Active Conversation Change
  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation._id);
      socket.emit('join_conversation', activeConversation._id);
      
      // Listen for new messages in this conversation
      socket.on('receive_message', (message) => {
        if (message.conversationId === activeConversation._id) {
          setMessages((prev) => [...prev, message]);
          markAsRead(activeConversation._id);
        }
      });

      socket.on('display_typing', ({ userId, isTyping }) => {
        setTypingUsers(prev => ({
          ...prev,
          [activeConversation._id]: { userId, isTyping }
        }));
      });

      return () => {
        socket.emit('leave_conversation', activeConversation._id);
        socket.off('receive_message');
        socket.off('display_typing');
      };
    }
  }, [activeConversation]);

  const fetchMessages = async (conversationId) => {
    try {
      const response = await api.get(`/conversations/id/${conversationId}/messages`);
      setMessages(response.data.messages || []);
      markAsRead(conversationId);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markAsRead = async (conversationId) => {
    try {
      await api.put(`/conversations/id/${conversationId}/read`);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !activeConversation) return;

    const content = inputMessage;
    setInputMessage('');

    try {
      // The socket will update the UI via 'receive_message' event from backend
      await api.post(`/conversations/id/${activeConversation._id}/messages`, { text: content });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleTyping = (e) => {
    setInputMessage(e.target.value);
    if (activeConversation) {
      socket.emit('typing', { 
        conversationId: activeConversation._id, 
        userId: user.id || user._id, 
        isTyping: e.target.value.length > 0 
      });
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isTyping = activeConversation && typingUsers[activeConversation._id]?.isTyping;

  return (
    <div className="h-[calc(100vh-120px)] flex bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden font-inter">
      
      {/* Left Panel: Conversation List */}
      <div className="w-96 flex flex-col border-r border-slate-100 bg-slate-50/30">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Messages</h2>
            <button className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-900 hover:text-white transition-all">
              <FiMoreVertical />
            </button>
          </div>
          <div className="relative group">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-100 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-600/5 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-2 no-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-50">
              <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest">Loading Chats...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center p-8 opacity-40">
              <p className="text-xs font-bold">No conversations found</p>
            </div>
          ) : conversations.map((conv) => {
            const isActive = activeConversation?._id === conv._id;
            const hasUnread = conv.messages?.some(m => m.status !== 'read' && m.senderModel === 'Customer');
            
            return (
              <motion.div 
                layout
                key={conv._id}
                onClick={() => setActiveConversation(conv)}
                className={`p-4 rounded-3xl flex items-center gap-4 cursor-pointer transition-all duration-300 ${isActive ? 'bg-white shadow-xl shadow-slate-200/50 border border-slate-100' : 'hover:bg-white/60'}`}
              >
                <div className="relative">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white font-black text-lg transition-colors ${isActive ? 'bg-blue-600' : 'bg-slate-300'}`}>
                    {(conv.customerId?.name || conv.phone || '?').charAt(0).toUpperCase()}
                  </div>
                  {conv.status === 'active' && <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 bg-emerald-500 border-2 border-white rounded-full" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-black text-slate-900 truncate">
                      {conv.customerId?.name || `+${conv.phone}`}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 truncate font-medium">
                      {conv.lastMessage || 'Start a conversation'}
                    </p>
                    {hasUnread && (
                      <div className="h-2.5 w-2.5 rounded-full bg-blue-600 ring-4 ring-blue-600/10" />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Right Panel: Chat Interface */}
      <div className="flex-1 flex flex-col bg-white relative">
        {!activeConversation ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-slate-50/50">
            <div className="h-20 w-20 rounded-[2rem] bg-white shadow-xl flex items-center justify-center text-blue-600 mb-6">
              <FiMessageCircle className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Select a Chat</h3>
            <p className="text-sm text-slate-400 font-bold max-w-xs mt-2 uppercase tracking-widest leading-relaxed">
              Pick a conversation from the sidebar to start messaging in real-time
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="h-20 px-8 flex items-center justify-between border-b border-slate-50 bg-white z-10">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black">
                  {(activeConversation.customerId?.name || activeConversation.phone || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">
                    {activeConversation.customerId?.name || `+${activeConversation.phone}`}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${isTyping ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {isTyping ? 'Typing...' : 'Online'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="h-10 w-10 rounded-xl hover:bg-slate-50 text-slate-400 transition-all flex items-center justify-center"><FiPhone /></button>
                <button className="h-10 w-10 rounded-xl hover:bg-slate-50 text-slate-400 transition-all flex items-center justify-center"><FiVideo /></button>
                <button 
                  onClick={() => setActiveConversation(null)}
                  className="h-10 w-10 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center lg:hidden"
                >
                  <FiX />
                </button>
              </div>
            </header>

            {/* Messages Area */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto px-10 py-8 space-y-4 bg-slate-50/30 no-scrollbar scroll-smooth"
            >
              <AnimatePresence mode="popLayout">
                {messages.map((msg, idx) => {
                  const isOwn = msg.senderModel === 'User';
                  const showAvatar = idx === 0 || messages[idx - 1]?.senderId !== msg.senderId;
                  
                  return (
                    <motion.div 
                      layout
                      key={msg._id || idx}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
                    >
                      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%]`}>
                        <div className={`px-5 py-3 rounded-[1.5rem] shadow-sm relative transition-all ${
                          isOwn 
                          ? 'bg-blue-600 text-white rounded-tr-none' 
                          : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                        }`}>
                          <p className="text-sm font-bold leading-relaxed whitespace-pre-wrap">
                            {msg.content || msg.text}
                          </p>
                          <div className={`flex items-center gap-1.5 mt-1.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <span className={`text-[8px] font-black uppercase tracking-tighter ${isOwn ? 'text-blue-100/60' : 'text-slate-400'}`}>
                              {formatTime(msg.timestamp || msg.createdAt)}
                            </span>
                            {isOwn && (
                              <div className="flex -space-x-1">
                                <FiCheck className={`h-2.5 w-2.5 ${msg.status === 'read' ? 'text-emerald-400' : 'text-blue-200'}`} />
                                {msg.status !== 'sent' && <FiCheck className={`h-2.5 w-2.5 ${msg.status === 'read' ? 'text-emerald-400' : 'text-blue-200'}`} />}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Input Area */}
            <footer className="p-6 bg-white border-t border-slate-50">
              <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 rounded-[2rem] px-6 py-3 transition-all focus-within:bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-600/5 shadow-sm">
                <button className="text-slate-400 hover:text-blue-600 transition-colors"><FiSmile className="h-5 w-5" /></button>
                <button className="text-slate-400 hover:text-blue-600 transition-colors"><FiPaperclip className="h-5 w-5" /></button>
                <input 
                  type="text"
                  placeholder="Type your message..."
                  className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-slate-700 placeholder:text-slate-400"
                  value={inputMessage}
                  onChange={handleTyping}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button 
                  onClick={sendMessage}
                  disabled={!inputMessage.trim()}
                  className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-all ${
                    inputMessage.trim() ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 active:scale-90' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <FiSend className="h-5 w-5" />
                </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
};

export default Chat;
