import { useState, useEffect } from 'react';
import { FiMessageCircle } from 'react-icons/fi';
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
      setChats(response.data.chats);
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const fetchQuickReplies = async () => {
    try {
      const response = await api.get('/quick-replies');
      setQuickReplies(response.data);
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
      setMessages(response.data.messages);
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
    try {
      await api.put(`/chats/${selectedChat._id}/close`, {});
      fetchChats();
      setSelectedChat(null);
    } catch (error) {
      console.error('Error closing chat:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 md:p-8 text-white">
      <div className="mb-8 rounded-2xl backdrop-blur-md border border-white/10 shadow-xl bg-slate-950/30 p-6">
        <h1 className="text-4xl font-bold text-white">My Chat</h1>
        <p className="text-cyan-200 mt-2">Manage your assigned customer conversations.</p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Chat List */}
        <div className="w-full lg:w-1/3">
          <h2 className="text-xl font-semibold mb-6 text-white">My Chats</h2>
          <div className="rounded-2xl backdrop-blur-md border border-white/10 shadow-xl bg-slate-950/30 overflow-y-auto" style={{ maxHeight: '600px' }}>
            {chats.map((chat) => (
              <div
                key={chat._id}
                onClick={() => selectChat(chat)}
                className={`p-4 border-b border-white/10 cursor-pointer hover:bg-blue-500/10 backdrop-blur-sm transition-all duration-300 ${
                  selectedChat?._id === chat._id ? 'bg-blue-500/10 border-blue-400 shadow-md' : ''
                }`}
              >
                <div className="font-semibold text-white">{chat.customerId?.name}</div>
                <div className="text-sm text-slate-300">{chat.customerId?.phone}</div>
                <div className="text-xs text-slate-400 mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    chat.status === 'active'
                      ? 'bg-green-500/10 backdrop-blur-sm border border-green-500/20 text-green-100'
                      : 'bg-slate-900/40 backdrop-blur-sm border border-white/10 text-slate-300'
                  }`}>
                    {chat.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="flex-1 px-4 py-2 text-sm bg-slate-900/40 backdrop-blur-sm border border-white/10 text-white rounded-xl disabled:opacity-50 transition-all"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              className="flex-1 px-4 py-2 text-sm bg-blue-500/80 hover:bg-blue-600/80 backdrop-blur-sm border border-blue-400/50 text-white rounded-xl transition-all"
            >
              Next
            </button>
          </div>
        </div>

        {/* Chat Window */}
        <div className="w-full lg:w-2/3">
          {selectedChat ? (
            <div className="rounded-2xl backdrop-blur-md border border-white/10 shadow-xl bg-slate-950/30 flex flex-col" style={{ height: 'calc(100vh - 260px)' }}>
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-white">{selectedChat.customerId?.name}</h3>
                  <p className="text-sm text-cyan-200">{selectedChat.customerId?.phone}</p>
                </div>
                <button
                  onClick={closeChat}
                  className="bg-red-500/80 hover:bg-red-600/80 backdrop-blur-sm border border-red-400/50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
                >
                  Close Chat
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {loadingMessages ? (
                  <div className="text-slate-500 text-center py-8">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-slate-500 text-center py-8">No messages yet for this chat.</div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg._id}
                      className={`flex ${msg.type === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="max-w-xs">
                        <span
                          className={`inline-block px-4 py-3 rounded-2xl backdrop-blur-sm ${
                            msg.type === 'outgoing'
                              ? 'bg-blue-500 text-white border border-blue-400/50'
                              : 'bg-slate-950/70 text-slate-100 border border-white/10'
                          }`}
                        >
                          {msg.message}
                        </span>
                        <div className="text-xs text-slate-500 mt-2 px-2">
                          {new Date(msg.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Quick Replies */}
              {quickReplies.length > 0 && (
                <div className="px-6 py-4 border-t border-white/10 bg-slate-950/30 backdrop-blur-sm">
                  <p className="text-sm font-semibold mb-3 text-white">Quick Replies:</p>
                  <div className="flex flex-wrap gap-3">
                    {quickReplies.map((reply) => (
                      <button
                        key={reply._id}
                        onClick={() => useQuickReply(reply)}
                        className="bg-blue-500/20 hover:bg-blue-500/30 backdrop-blur-sm border border-blue-400/20 text-cyan-100 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                      >
                        {reply.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div className="p-6 border-t border-white/10 flex gap-3 bg-slate-950/30 backdrop-blur-sm">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type message..."
                  className="flex-1 px-4 py-3 border border-white/10 bg-slate-900/40 backdrop-blur-sm rounded-full focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none text-white"
                />
                <button
                  onClick={sendMessage}
                  className="bg-blue-500/80 hover:bg-blue-600/80 backdrop-blur-sm border border-blue-400/50 text-white px-6 py-3 rounded-full font-medium transition-all"
                >
                  Send
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl backdrop-blur-md border-2 border-dashed border-white/10 bg-slate-950/30 p-8 text-center">
              <FiMessageCircle className="mx-auto mb-4 h-12 w-12 text-cyan-200" />
              <p className="text-xl font-semibold text-white">Select a chat to start</p>
              <p className="text-slate-400 mt-2">Choose a conversation from the list to begin messaging.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffChat;

