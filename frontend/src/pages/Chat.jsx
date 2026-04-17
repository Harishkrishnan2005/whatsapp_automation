import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiMessageCircle, FiSend } from 'react-icons/fi';
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
      setChatHistory((prev) => [...prev, { type: 'user', text: outgoingText }, botPayload]);

      if (response.data?.type === 'payment' && response.data?.payment) {
        openRazorpayPopup(response.data.payment);
      }

      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      setChatHistory((prev) => [
        ...prev,
        { type: 'user', text: outgoingText },
        {
          type: 'bot',
          response: error?.response?.data?.message || 'Neural Link Error: Unable to process transmission.',
          text: error?.response?.data?.message || 'Neural Link Error: Unable to process transmission.',
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
              },
            ]);
          } catch (verifyError) {
            setChatHistory((prev) => [
              ...prev,
              {
                type: 'bot',
                response: `Verification Latency: ${verifyError?.response?.data?.message || 'Resolution failed.'}`,
                text: `Verification Latency: ${verifyError?.response?.data?.message || 'Resolution failed.'}`,
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
        return <a key={`link-${idx}`} href={part} target="_blank" rel="noreferrer" className="text-blue-600 font-black underline">{part}</a>;
      }
      return <span key={`txt-${idx}`}>{part}</span>;
    });
  };

  return (
    <div className="space-y-10 animate-fade-in h-[calc(100vh-120px)] flex flex-col pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none flex items-center gap-3">
             Neural Simulation
             <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </h1>
          <p className="mt-2 text-slate-500 font-medium">Validating edge-case chatbot logic and product dissemination protocols.</p>
        </div>
        <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200/60 shadow-sm">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status</p>
           <p className="text-sm font-bold text-slate-900 mt-1 uppercase">Emulator Operational</p>
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm flex-1 flex flex-col overflow-hidden mx-4">
        {/* Chat Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
           <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center text-white ring-4 ring-white shadow-sm">
                 <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              </div>
              <div>
                 <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Active Transmissions</p>
                 <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">End-to-End Encrypted</p>
              </div>
           </div>
           {phone && <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-2 rounded-xl bg-slate-100">Target: {phone}</div>}
        </div>

        {/* Message Thread */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar bg-slate-50/10">
           {chatHistory.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-center opacity-30 select-none">
                <div className="h-24 w-24 rounded-full border-4 border-dashed border-slate-200 mb-6 flex items-center justify-center">
                   <FiMessageCircle className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-black text-slate-400 uppercase tracking-tighter">Awaiting Signal</h3>
                <p className="text-[10px] uppercase font-black tracking-widest mt-2 max-w-[200px]">Establish node identity via phone entry to start protocol.</p>
             </div>
           ) : chatHistory.map((msg, index) => (
             <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] flex items-end gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                   {msg.type === 'bot' && (
                      <div className="h-8 w-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-white text-[10px] font-black flex-shrink-0">A</div>
                   )}
                   <div className="space-y-2">
                      {msg.response || msg.text ? (
                        <div className={`p-5 rounded-[2rem] shadow-sm border ${
                          msg.type === 'user' 
                          ? 'bg-blue-600 text-white border-blue-500 rounded-br-md text-sm font-medium' 
                          : 'bg-white text-slate-800 border-slate-100 rounded-bl-md text-sm font-semibold'
                        }`}>
                           <p className="whitespace-pre-line leading-relaxed">{msg.type === 'user' ? msg.text : renderTextWithLinks(msg.response || msg.text)}</p>
                        </div>
                      ) : null}

                      {msg.products && msg.products.length > 0 && (
                        <div className="pt-2">
                           <ProductCarousel 
                             products={msg.products} 
                             onProductBuy={(p) => sendWebhookMessage(p?.name || '')} 
                           />
                        </div>
                      )}
                   </div>
                </div>
             </motion.div>
           ))}
        </div>

        {/* Input Matrix */}
        <div className="p-8 bg-white border-t border-slate-100">
           <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                placeholder="Phone (Node ID)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full md:w-1/3 bg-slate-100/50 border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all"
              />
              <div className="flex-1 relative flex items-center">
                 <input
                   type="text"
                   placeholder="Enter transmission payload..."
                   value={message}
                   onChange={(e) => setMessage(e.target.value)}
                   onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                   className="w-full bg-slate-100/50 border-slate-200 rounded-2xl px-5 py-4 pr-32 text-sm font-black text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all"
                 />
                 <button
                   onClick={sendMessage}
                   disabled={!phone || !message}
                   className="absolute right-2 h-10 px-6 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all flex items-center gap-2"
                 >
                    Send Signal
                    <FiSend className="h-3 w-3" />
                 </button>
              </div>
           </div>
           <p className="mt-4 text-[9px] font-black text-slate-300 uppercase tracking-widest text-center">Neural Link V4.2 Core Emulation</p>
        </div>
      </div>
    </div>
  );
};

export default Chat;
