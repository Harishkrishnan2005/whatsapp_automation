import { useState, useEffect, useRef } from 'react';
import { FiSend, FiUser, FiClock, FiInbox, FiMessageCircle, FiSearch } from 'react-icons/fi';
import api from '../../utils/api';

const SimulationChat = () => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat._id);
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChats = async () => {
    setLoadingChats(true);
    try {
      const response = await api.get('/chat');
      setChats(response.data);
    } catch (error) {
           console.error('Failed to fetch chats:', error);
    } finally {
      setLoadingChats(false);
    }
  };

  const fetchMessages = async (chatId) => {
    setLoadingMessages(true);
    try {
      const response = await api.get(`/chat/${chatId}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedChat) return;

    const messageContent = inputMessage;
    setInputMessage('');

    try {
      const response = await api.post('/chat/send', {
        chatId: selectedChat._id,
        message: messageContent
      });
      // Append message instantly
      setMessages(prev => [...prev, response.data]);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-[#f0f2f5]">
      {/* LEFT PANEL - Chat list */}
      <aside className="w-[30%] bg-white border-r border-gray-300 flex flex-col min-w-[320px] shadow-sm">
        <div className="p-4 bg-[#f0f2f5] border-b border-gray-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-full bg-slate-300 flex items-center justify-center text-slate-600">
                <FiUser className="h-6 w-6" />
             </div>
             <h2 className="text-base font-bold text-gray-800">Chats</h2>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
          {loadingChats ? (
            <div className="flex flex-col items-center justify-center h-40 opacity-40">
              <div className="h-6 w-6 border-2 border-slate-200 border-t-[#00a884] rounded-full animate-spin mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest">Loading Chats...</p>
            </div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-30">
              <FiInbox className="h-12 w-12 mb-4" />
              <p className="font-bold text-sm uppercase tracking-widest">No conversations</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {chats.map((chat) => (
                <div
                  key={chat._id}
                  onClick={() => setSelectedChat(chat)}
                  className={`px-4 py-3 cursor-pointer transition-all duration-200 flex items-center gap-3 ${
                    selectedChat?._id === chat._id
                      ? 'bg-[#f0f2f5]'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="h-12 w-12 rounded-full flex-shrink-0 bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-lg">
                    {chat.name ? chat.name[0].toUpperCase() : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h4 className="font-semibold text-[15px] truncate text-gray-900 capitalize">
                        {chat.name}
                      </h4>
                      <span className="text-[11px] text-gray-500 whitespace-nowrap">
                        {formatTime(chat.lastMessageTime)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm truncate text-gray-500 mt-1 max-w-[180px]">
                        {chat.lastMessage}
                      </p>
                      {chat.unreadCount > 0 && (
                        <span className="h-5 w-5 bg-[#25d366] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* RIGHT PANEL - Chat window */}
      <main className="w-[70%] flex flex-col relative bg-[#efeae2]">
        {/* WhatsApp Doodle Background */}
        <div 
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}
        />

        {selectedChat ? (
          <>
            {/* Header */}
            <header className="bg-[#f0f2f5] border-b border-gray-300 px-4 py-2 sticky top-0 z-10 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm">
                  {selectedChat.name ? selectedChat.name[0].toUpperCase() : '?'}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 leading-tight capitalize">{selectedChat.name}</h3>
                  <p className="text-[11px] text-gray-500">
                    {selectedChat.phone} • simulation mode
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-gray-500">
                 <button className="p-2 hover:bg-gray-200 rounded-full transition-colors"><FiSearch /></button>
              </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-10 py-6 space-y-2 custom-scrollbar relative">
              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="h-8 w-8 border-3 border-gray-200 border-t-[#00a884] rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex justify-center mt-10">
                   <div className="bg-[#fff1c1] text-gray-600 text-[11px] px-4 py-1 rounded-lg uppercase tracking-wider font-bold shadow-sm">Start conversation</div>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isOutgoing = msg.type === 'outgoing';
                  const isAdmin = msg.senderType === 'admin';
                  const isBot = msg.senderType === 'bot' || (isOutgoing && !msg.senderType);

                  return (
                    <div
                      key={index}
                      className={`flex w-full mb-1 ${isOutgoing ? 'justify-end pl-12' : 'justify-start pr-12'}`}
                    >
                      <div
                        className={`max-w-[85%] px-3 py-1.5 rounded-lg shadow-sm relative group ${
                          isOutgoing
                            ? 'bg-[#dcf8c6] text-gray-900 rounded-tr-none'
                            : 'bg-white text-gray-900 rounded-tl-none'
                        }`}
                      >
                         {/* Bubble Tail */}
                         <div className={`absolute top-0 w-3 h-3 ${
                           isOutgoing 
                             ? 'right-[-8px] text-[#dcf8c6]' 
                             : 'left-[-8px] text-white'
                         }`}>
                           <svg viewBox="0 0 8 13" height="13" width="8" preserveAspectRatio="xMidYMid meet" fill="currentColor">
                             <path d={isOutgoing 
                               ? "M1.533 3.568 8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568Z" 
                               : "M6.467 3.568 0 12.193V1h5.188c1.77 0 2.338 1.156 1.279 2.568Z"} 
                             />
                           </svg>
                         </div>

                         <div className="flex flex-col">
                            {isBot && (
                               <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter mb-0.5">Automated Neural Response</span>
                            )}
                            {isAdmin && (
                               <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter mb-0.5">Admin Response</span>
                            )}
                            <p className="text-[14.5px] leading-[19px] whitespace-pre-wrap">{msg.message}</p>
                            <div className="flex items-center justify-end gap-1 -mb-1 mt-1 ml-10">
                               <span className="text-[10px] text-gray-400 font-medium">
                                 {formatTime(msg.createdAt)}
                               </span>
                               {isOutgoing && (
                                 <div className="flex text-[#34b7f1] font-bold">
                                    <svg viewBox="0 0 16 11" height="11" width="16" preserveAspectRatio="xMidYMid meet" fill="currentColor"><path d="M11.053 1.514 5.373 7.194 2.433 4.254.803 5.884l4.57 4.57 7.31-7.31-1.63-1.63Zm3.84 0-7.31 7.31-.21-.21.21.21-1.63-1.63 7.31-7.31 1.63 1.63Z"></path></svg>
                                 </div>
                               )}
                            </div>
                         </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form 
              onSubmit={handleSendMessage}
              className="bg-[#f0f2f5] p-2.5 flex gap-2 items-center min-h-[62px]"
            >
              <div className="flex-1 bg-white rounded-lg px-4 py-2.5 shadow-sm flex items-center">
                 <input
                   type="text"
                   placeholder="Type a message..."
                   value={inputMessage}
                   onChange={(e) => setInputMessage(e.target.value)}
                   className="flex-1 bg-transparent text-[15px] text-gray-700 outline-none"
                 />
              </div>
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
                  inputMessage.trim() ? 'bg-[#00a884] shadow-md active:scale-90' : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                <FiSend className="h-5 w-5 text-white" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-20 z-10">
            <div className="h-40 w-40 rounded-full bg-gray-200/50 flex items-center justify-center mb-10 overflow-hidden border-2 border-white">
              <img 
                src="https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png" 
                alt="placeholder" 
                className="opacity-20 scale-150"
              />
            </div>
            <h2 className="text-[32px] font-thin text-gray-500 mb-4">WhatsApp Web Simulation</h2>
            <p className="max-w-[450px] text-sm text-gray-500 leading-relaxed font-light">
               Select a conversation to begin simulating messages. You can respond manually to override the chatbot or test your flows.
            </p>
            <div className="mt-auto pt-20 border-t border-gray-300 w-full flex items-center justify-center gap-2 text-gray-400 text-xs">
               <FiInbox className="h-3 w-3" />
               <span>End-to-end encrypted for simulation</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SimulationChat;
