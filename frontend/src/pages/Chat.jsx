import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiMessageCircle, FiSend, FiSearch, FiMoreVertical, FiUser, FiInfo } from 'react-icons/fi';
import api from '../utils/api';
import ProductCarousel from '../components/ProductCarousel';

const Chat = () => {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const sendWebhookMessage = async (outgoingText) => {
    if (!phone || !outgoingText) return;
    try {
      const response = await api.post('/chatbot/send', {
        phone,
        message: outgoingText,
      });
      const botPayload = { type: 'bot', ...response.data };
      setChatHistory((prev) => [...prev, { type: 'user', text: outgoingText, createdAt: new Date() }, botPayload]);

      if (response.data?.type === 'payment' && response.data?.payment) {
        openRazorpayPopup(response.data.payment);
      }

      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMsg = error?.response?.data?.message || 'Neural Link Error: Unable to process transmission.';
      setChatHistory((prev) => [
        ...prev,
        { type: 'user', text: outgoingText, createdAt: new Date() },
        {
          type: 'bot',
          response: errorMsg,
          text: errorMsg,
          createdAt: new Date()
        },
      ]);
      return null;
    }
  };

  const openRazorpayPopup = (paymentPayload) => {
    try {
      if (!window.Razorpay) {
        setChatHistory((prev) => [
          ...prev,
          {
            type: 'bot',
            response: 'Transaction Protocol Failed: Razorpay SDK not detected.',
            text: 'Transaction Protocol Failed: Razorpay SDK not detected.',
            createdAt: new Date()
          },
        ]);
        return;
      }

      const options = {
        key: paymentPayload.keyId,
        amount: paymentPayload.amount,
        currency: paymentPayload.currency || 'INR',
        order_id: paymentPayload.razorpayOrderId,
        name: 'Enterprise Automation',
        description: 'Secure Node Settlement',
        prefill: {
          name: paymentPayload.customer?.name || 'Authorized Client',
          contact: paymentPayload.customer?.contact || '',
        },
        theme: { color: '#2563eb' },
        handler: async function onPaymentSuccess(razorpayResponse) {
          try {
            await api.post('/webhook/payment/verify', {
              orderId: paymentPayload.internalOrderId,
              razorpayOrderId: razorpayResponse.razorpay_order_id,
              razorpayPaymentId: razorpayResponse.razorpay_payment_id,
              razorpaySignature: razorpayResponse.razorpay_signature,
            });

            setChatHistory((prev) => [
              ...prev,
              {
                type: 'bot',
                response: `Settlement Confirmed.\nTrace ID: ${razorpayResponse.razorpay_payment_id}\nOrder node ${paymentPayload.internalOrderId} initialized.`,
                text: `Settlement Confirmed.\nTrace ID: ${razorpayResponse.razorpay_payment_id}\nOrder node ${paymentPayload.internalOrderId} initialized.`,
                createdAt: new Date()
              },
            ]);
          } catch (verifyError) {
            setChatHistory((prev) => [
              ...prev,
              {
                type: 'bot',
                response: `Verification Latency: ${verifyError?.response?.data?.message || 'Resolution failed.'}`,
                text: `Verification Latency: ${verifyError?.response?.data?.message || 'Resolution failed.'}`,
                createdAt: new Date()
              },
            ]);
          }
        },
        modal: {
          ondismiss: () => {
            setChatHistory((prev) => [
              ...prev,
              {
                type: 'bot',
                response: 'Transaction Aborted: User termination detected.',
                text: 'Transaction Aborted: User termination detected.',
                createdAt: new Date()
              },
            ]);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Razorpay popup error:', error);
    }
  };

  const sendMessage = async () => {
    if (!phone || !message) return;
    const outgoingText = message;
    setMessage('');
    await sendWebhookMessage(outgoingText);
  };

  const renderTextWithLinks = (text) => {
    const content = String(text || '');
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);

    return parts.map((part, idx) => {
      if (/^https?:\/\//i.test(part)) {
        return <a key={`link-${idx}`} href={part} target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline decoration-blue-200 decoration-2 underline-offset-4">{part}</a>;
      }
      return <span key={`txt-${idx}`}>{part}</span>;
    });
  };

  const formatTime = (date) => {
    const d = date ? new Date(date) : new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] max-w-5xl mx-auto overflow-hidden bg-[#efeae2] border border-gray-300 rounded-2xl shadow-2xl relative">
       {/* WhatsApp Doodle Background */}
       <div 
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}
       />

       {/* Header */}
       <header className="bg-[#f0f2f5] border-b border-gray-300 px-6 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
             <div className="h-12 w-12 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-md">
                <FiMessageCircle className="h-6 w-6" />
             </div>
             <div>
                <h2 className="font-bold text-gray-800 leading-none">WhatsApp Bot Simulator</h2>
                <div className="flex items-center gap-1.5 mt-1.5">
                   <span className="h-2 w-2 rounded-full bg-[#25d366] animate-pulse" />
                   <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">Neural Link Active</span>
                </div>
             </div>
          </div>
          <div className="flex items-center gap-4 text-gray-500">
             <div className="hidden md:flex flex-col items-end">
                <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Phone Node</span>
                <input 
                  type="text" 
                  placeholder="Enter Phone..." 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-white/50 border-none px-2 py-0.5 rounded text-xs font-bold text-gray-700 focus:bg-white outline-none w-32"
                />
             </div>
             <button className="p-2 hover:bg-gray-200 rounded-full transition-colors"><FiSearch className="h-5 w-5"/></button>
             <button className="p-2 hover:bg-gray-200 rounded-full transition-colors"><FiMoreVertical className="h-5 w-5"/></button>
          </div>
       </header>

       {/* Main Chat Area */}
       <div 
         ref={chatContainerRef}
         className="flex-1 overflow-y-auto px-8 md:px-14 py-8 space-y-3 custom-scrollbar relative z-0"
       >
          {chatHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
               <div className="bg-[#fff1c1] text-[#725a2c] text-[11px] px-6 py-2 rounded-lg font-bold shadow-sm uppercase tracking-wide border border-[#e6daae]">
                  End-to-end encrypted protocol initiated
               </div>
               <div className="mt-10 max-w-sm">
                  <p className="text-gray-500 text-sm font-medium leading-relaxed">
                     Enter a phone number in the header and type a message below to test the automated chatbot flows.
                  </p>
               </div>
            </div>
          ) : (
            chatHistory.map((msg, index) => {
              const isUser = msg.type === 'user';
              
              return (
                <div key={index} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[85%] px-3 py-1.5 rounded-lg shadow-sm relative group ${
                     isUser 
                     ? 'bg-[#dcf8c6] text-gray-900 rounded-tr-none' 
                     : 'bg-white text-gray-900 rounded-tl-none'
                   }`}>
                      {/* Tail */}
                      <div className={`absolute top-0 w-3 h-3 ${
                        isUser ? 'right-[-8px] text-[#dcf8c6]' : 'left-[-8px] text-white'
                      }`}>
                         <svg viewBox="0 0 8 13" height="13" width="8" preserveAspectRatio="xMidYMid meet" fill="currentColor">
                           <path d={isUser 
                             ? "M1.533 3.568 8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568Z" 
                             : "M6.467 3.568 0 12.193V1h5.188c1.77 0 2.338 1.156 1.279 2.568Z"} 
                           />
                         </svg>
                      </div>

                      <div className="flex flex-col">
                         {!isUser && (
                           <span className="text-[10px] font-bold text- emerald-600 uppercase tracking-tighter mb-1 select-none">Automated Bot</span>
                         )}
                         <div className="text-[14.5px] leading-[19px] whitespace-pre-wrap">
                            {isUser ? msg.text : renderTextWithLinks(msg.response || msg.text)}
                         </div>

                         {/* Products */}
                         {!isUser && msg.products && msg.products.length > 0 && (
                           <div className="mt-3 bg-gray-50 rounded-xl overflow-hidden mb-1 border border-gray-100">
                             <ProductCarousel 
                               products={msg.products} 
                               onProductBuy={(p) => sendWebhookMessage(p?.name || '')} 
                             />
                           </div>
                         )}

                         <div className="flex items-center justify-end gap-1 -mb-1 mt-1 ml-10">
                            <span className="text-[9px] text-gray-400 font-medium tracking-tight">
                               {formatTime(msg.createdAt)}
                            </span>
                            {isUser && (
                              <div className="flex text-[#34b7f1] font-bold">
                                 <svg viewBox="0 0 16 11" height="11" width="16" preserveAspectRatio="xMidYMid meet" fill="currentColor"><path d="M11.053 1.514 5.373 7.194 2.433 4.254.803 5.884l4.57 4.57 7.31-7.31-1.63-1.63Zm3.84 0-7.31 7.31-.21-.21.21.21-1.63-1.63 7.31-7.31 1.63 1.63Z"></path></svg>
                              </div>
                            )}
                         </div>
                      </div>
                   </div>
                </div>
              );
            })
          )}
       </div>

       {/* Input Area */}
       <footer className="bg-[#f0f2f5] px-6 py-4 flex gap-4 items-center z-10">
          <div className="flex-1 bg-white rounded-xl shadow-sm px-5 py-3 flex items-center border border-transparent focus-within:border-emerald-100 transition-all">
             <input
               type="text"
               placeholder={phone ? "Type a message..." : "Enter phone above to begin..."}
               value={message}
               onChange={(e) => setMessage(e.target.value)}
               onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
               disabled={!phone}
               className="flex-1 bg-transparent text-[15px] text-gray-700 outline-none"
             />
          </div>
          <button
             onClick={sendMessage}
             disabled={!phone || !message.trim()}
             className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
               message.trim() ? 'bg-[#00a884] shadow-lg active:scale-90 hover:bg-[#009173]' : 'bg-gray-400 cursor-not-allowed'
             }`}
          >
             <FiSend className="h-5 w-5 text-white" />
          </button>
       </footer>
    </div>
  );
};

export default Chat;
