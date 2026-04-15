import { useState, useEffect, useCallback } from 'react';
import { FiMessageCircle } from 'react-icons/fi';
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
      const response = await api.get('/auth/staff');
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
      setSelectedCustomer((prev) => (
        prev && prev._id === customerId
          ? { ...prev, unreadCount: 0 }
          : prev
      ));
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

  const totalMessageCount = selectedCustomer
    ? Number(selectedCustomer.totalMessages || 0) || messages.length
    : 0;
  const totalUnreadCount = chats.reduce((sum, chat) => sum + Number(chat.unreadCount || 0), 0);

  const formatUnreadCount = (count) => {
    const value = Number(count || 0);
    if (value <= 0) return '';
    if (value > 99) return '99+';
    return String(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 md:p-8 text-white">
      <div className="mb-8 rounded-2xl backdrop-blur-md border border-white/10 shadow-xl bg-slate-950/30 p-6">
        <h1 className="text-4xl font-bold text-white">Chat Management</h1>
        <p className="text-cyan-200 mt-2">Manage customer conversations and send responses.</p>
        <div className="inline-flex items-center gap-2 rounded-2xl backdrop-blur-md border border-white/10 bg-cyan-500/10 px-4 py-2 mt-4 text-cyan-100">
          <span className="inline-flex h-3 w-3 rounded-full bg-cyan-400" />
          <span className="text-sm font-semibold text-emerald-700">
            New messages: {formatUnreadCount(totalUnreadCount) || '0'}
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-6 overflow-hidden" style={{ height: 'calc(100vh - 240px)' }}>
        {/* LEFT PANEL - Customer List */}
        <div className="w-1/3 flex flex-col rounded-2xl backdrop-blur-md border border-white/10 shadow-xl bg-slate-950/30 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full px-4 py-3 border border-white/10 bg-slate-900/40 backdrop-blur-sm rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none text-white placeholder:text-cyan-200"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                <p>Loading conversations...</p>
              </div>
            ) : chats.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                <p>No conversations found</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {chats.map((chat) => (
                  <div
                    key={chat._id}
                    onClick={() => handleSelectCustomer(chat)}
                    className={`p-4 cursor-pointer hover:bg-white/10 backdrop-blur-sm border-l-4 transition-all duration-300 ${
                      selectedCustomer?._id === chat._id
                        ? 'bg-cyan-500/10 border-cyan-300 shadow-xl'
                        : 'border-transparent hover:border-cyan-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-white">{chat.name || 'Unknown'}</p>
                        <p className="text-xs text-cyan-200 mt-1">{chat.phone}</p>
                        <p className="text-xs text-cyan-200/80 mt-2 line-clamp-2 truncate">
                          {chat.lastMessage}
                        </p>
                      </div>
                      <div className="ml-2 text-right flex-shrink-0">
                        <p className="text-xs text-slate-500">
                          {formatTime(chat.lastMessageTime)}
                        </p>
                        {chat.unreadCount > 0 && (
                          <span className="mt-1 inline-flex min-w-[22px] items-center justify-center rounded-full bg-green-500 px-2 text-[11px] font-bold text-white shadow-lg">
                            {formatUnreadCount(chat.unreadCount)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-4 bg-slate-950/30 backdrop-blur-sm flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="flex-1 px-4 py-2 text-sm bg-white/10 backdrop-blur-sm border border-white/10 text-cyan-100 rounded-xl hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              className="flex-1 px-4 py-2 text-sm bg-blue-500/80 backdrop-blur-sm border border-blue-400/50 text-white rounded-xl hover:bg-blue-600/80 transition-all"
            >
              Next
            </button>
          </div>
        </div>

        {/* RIGHT PANEL - Chat Window */}
        {selectedCustomer ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl backdrop-blur-md border border-white/10 shadow-xl bg-slate-950/30">
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{selectedCustomer.name || 'Unknown'}</h2>
                  <p className="text-blue-100 text-sm">{selectedCustomer.phone}</p>
                </div>
                <div className="text-right space-y-2">
                  <p className="text-sm font-medium">{selectedCustomer.status}</p>
                  <p className="text-xs text-blue-100">
                    Total messages: {totalMessageCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className="rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-xs text-white outline-none"
                    >
                      <option value="" className="bg-slate-900">Assign staff</option>
                      {staffMembers.map((staff) => (
                        <option key={staff._id} value={staff._id} className="bg-slate-900">
                          {staff.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAssignChat}
                      disabled={!selectedStaffId || assigning}
                      className="rounded-lg border border-cyan-300/40 bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-100 disabled:opacity-50"
                    >
                      {assigning ? 'Assigning...' : 'Assign'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 min-h-0 space-y-4 overflow-y-auto bg-slate-950/20 p-6">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-cyan-200">
                  <div className="text-center">
                    <FiMessageCircle className="mx-auto mb-4 h-12 w-12 text-cyan-200" />
                    <p className="text-lg font-semibold">No messages yet</p>
                  
                  </div>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={`${msg._id}-${msg.createdAt}-${index}`}
                    className={`mb-3 flex ${msg.type === 'incoming' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className="max-w-[70%]">
                      {Array.isArray(msg.products) && msg.products.length > 0 && (
                        <div
                          className={`w-fit max-w-[320px] rounded-2xl border p-3 shadow-lg backdrop-blur-sm ${
                            msg.type === 'incoming'
                              ? 'border-slate-200/50 bg-white/90'
                              : 'border-blue-300/50 bg-blue-50/90'
                          }`}
                        >
                          <div className="flex flex-col gap-2">
                            {msg.products.map((product) => (
                              <div key={String(product._id)} className="w-fit max-w-[300px] rounded-xl border border-slate-500/30 bg-slate-950/70 p-3 shadow-sm">
                                <div className="mb-2 h-32 w-full overflow-hidden rounded-md bg-slate-900/60">
                                  {product.image ? (
                                    <img src={product.image} alt={product.name} className="h-32 w-full rounded-md object-cover" />
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-xs text-slate-400">No image</div>
                                  )}
                                </div>
                                <p className="truncate text-sm font-semibold text-slate-100">{product.name}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <span className="text-xs text-slate-400 line-through">Rs {Number(product.mrp || 0).toFixed(2)}</span>
                                  <span className="text-sm font-bold text-green-300">Rs {Number(product.offerPrice || 0).toFixed(2)}</span>
                                  <span className="rounded bg-red-500/10 backdrop-blur-sm border border-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-200">
                                    {Number(product.offerPercentage || 0)}% OFF
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-slate-400">{product.category || 'General'} | {product.unitType || 'unit'}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {msg.message && (
                        <div
                          className={`mt-2 rounded-2xl px-4 py-3 backdrop-blur-sm ${
                            msg.type === 'incoming'
                              ? 'bg-slate-950/70 text-slate-100 rounded-bl-sm border border-slate-500/30'
                              : 'bg-blue-500 text-white rounded-br-sm border border-blue-400/50'
                          }`}
                        >
                          {Array.isArray(msg.products) && msg.products.length > 0 && (
                            <p className={`mb-1 text-[11px] font-semibold uppercase tracking-wide ${msg.type === 'incoming' ? 'text-slate-600' : 'text-blue-100'}`}>
                              Offer Message
                            </p>
                          )}
                          <p className="text-sm break-words">{msg.message}</p>
                          <p
                            className={`text-xs mt-1 ${
                              msg.type === 'incoming' ? 'text-slate-600' : 'text-blue-100'
                            }`}
                          >
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="border-t border-white/10 p-6 bg-slate-950/40 backdrop-blur-sm">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Type a reply..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  className="flex-1 px-4 py-3 border border-white/10 bg-slate-900/40 backdrop-blur-sm rounded-full focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sendingMessage}
                  className="bg-blue-500/80 hover:bg-blue-600/80 backdrop-blur-sm border border-blue-400/50 text-white px-6 py-3 rounded-full font-medium transition-all disabled:opacity-50"
                >
                  {sendingMessage ? '...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center rounded-2xl backdrop-blur-md border-2 border-dashed border-white/10 bg-slate-950/30">
            <div className="text-center">
              <FiMessageCircle className="mx-auto mb-4 h-12 w-12 text-cyan-200" />
              <p className="text-xl font-semibold text-white">Select a conversation</p>
              <p className="text-slate-400 mt-2">Choose a customer from the list to view and manage their messages.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatManagement;

