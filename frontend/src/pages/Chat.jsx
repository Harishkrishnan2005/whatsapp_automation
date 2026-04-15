import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import ProductCarousel from '../components/ProductCarousel';
import { useAuth } from '../context/AuthContext';

const Chat = () => {
  const { user } = useAuth();
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
      const response = await api.post('/webhook', {
        phone,
        message: outgoingText,
        businessId: user?.businessId,
      });
      const botPayload = { type: 'bot', ...response.data };
      setChatHistory((prev) => [...prev, { type: 'user', text: outgoingText }, botPayload]);

      if (response.data?.type === 'payment' && response.data?.payment) {
        openRazorpayPopup(response.data.payment);
      }

      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      console.error('Webhook API error payload:', error?.response?.data);
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
            response: 'Payment SDK is not loaded. Please refresh and try again.',
            text: 'Payment SDK is not loaded. Please refresh and try again.',
          },
        ]);
        return;
      }

      const options = {
        key: paymentPayload.keyId,
        amount: paymentPayload.amount,
        currency: paymentPayload.currency || 'INR',
        order_id: paymentPayload.razorpayOrderId,
        name: 'WhatsApp Automation',
        description: 'Order Payment',
        prefill: {
          name: paymentPayload.customer?.name || 'Customer',
          contact: paymentPayload.customer?.contact || '',
        },
        theme: {
          color: '#1E3A8A',
        },
        handler: async function onPaymentSuccess(razorpayResponse) {
          try {
            await api.post('/webhook/payment/verify', {
              businessId: user?.businessId,
              orderId: paymentPayload.internalOrderId,
              razorpayOrderId: razorpayResponse.razorpay_order_id,
              razorpayPaymentId: razorpayResponse.razorpay_payment_id,
              razorpaySignature: razorpayResponse.razorpay_signature,
            });

            setChatHistory((prev) => [
              ...prev,
              {
                type: 'bot',
                response: `Payment successful.\nPayment ID: ${razorpayResponse.razorpay_payment_id}\nOrder ${paymentPayload.internalOrderId} confirmed.`,
                text: `Payment successful.\nPayment ID: ${razorpayResponse.razorpay_payment_id}\nOrder ${paymentPayload.internalOrderId} confirmed.`,
              },
            ]);
          } catch (verifyError) {
            setChatHistory((prev) => [
              ...prev,
              {
                type: 'bot',
                response: `Payment captured but verification failed. ${verifyError?.response?.data?.message || 'Please contact support.'}`,
                text: `Payment captured but verification failed. ${verifyError?.response?.data?.message || 'Please contact support.'}`,
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
                response: 'Payment popup closed. You can try online payment again from menu.',
                text: 'Payment popup closed. You can try online payment again from menu.',
              },
            ]);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        setChatHistory((prev) => [
          ...prev,
          {
            type: 'bot',
            response: 'Payment failed. Please try again.',
            text: 'Payment failed. Please try again.',
          },
        ]);
      });
      rzp.open();
    } catch (error) {
      console.error('Razorpay popup error:', error);
      setChatHistory((prev) => [
        ...prev,
        {
          type: 'bot',
          response: `Unable to open payment popup. ${error.message || ''}`.trim(),
          text: `Unable to open payment popup. ${error.message || ''}`.trim(),
        },
      ]);
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
        return (
          <a
            key={`link-${idx}`}
            href={part}
            target="_blank"
            rel="noreferrer"
            className="break-all text-cyan-300 underline"
          >
            {part}
          </a>
        );
      }
      return <span key={`txt-${idx}`}>{part}</span>;
    });
  };

  const renderMessage = (msg, index) => {
    if (msg.type === 'user') {
      return (
        <div key={index} className="mb-3 flex justify-end">
          <div className="max-w-[70%]">
            <div className="rounded-2xl rounded-br-md bg-blue-500 p-3 text-white shadow-sm">
              <p className="text-sm">{msg.text}</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={index} className="mb-3 flex justify-start">
        <div className="flex max-w-[70%] items-end gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500">
            <span className="text-xs font-bold text-white">B</span>
          </div>

          <div className="flex flex-col gap-2">
            {msg.response && (
              <div className="max-w-[320px] rounded-2xl rounded-bl-md border border-slate-300 bg-slate-100 p-3 shadow-sm">
                <p className="whitespace-pre-line text-sm text-slate-800">{renderTextWithLinks(msg.response)}</p>
              </div>
            )}

            {msg.products && msg.products.length > 0 && (
              <div className="w-fit max-w-[320px]">
                <ProductCarousel
                  products={msg.products}
                  onProductBuy={(product) => {
                    sendWebhookMessage(product?.name || '');
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-hidden bg-app-page p-4 md:p-6">
      <div className="mx-auto mb-4 max-w-4xl">
        <h1 className="mb-2 text-4xl font-bold text-primary">Chat Simulator</h1>
        <p className="text-secondary">Test the WhatsApp chatbot with product browsing and ordering.</p>
      </div>

      <div className="surface-card mx-auto flex h-[calc(100%-6.5rem)] min-h-0 max-w-4xl flex-col overflow-hidden rounded-2xl border border-surface shadow-soft">
        <div className="border-b border-surface bg-surface-muted px-6 py-4">
          <h2 className="font-semibold text-primary">WhatsApp Chat Simulator</h2>
          <p className="text-sm text-secondary">Experience our AI chatbot with product catalog</p>
        </div>

        <div
          ref={chatContainerRef}
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-surface p-4"
        >
          {chatHistory.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mb-2 text-2xl font-semibold text-primary">Chat</div>
                <p className="text-lg font-medium text-primary">Start a conversation</p>
                <p className="text-sm text-secondary">Enter a phone number and send "Hi" to begin</p>
              </div>
            </div>
          )}
          {chatHistory.map((msg, index) => renderMessage(msg, index))}
        </div>

        <div className="border-t border-surface bg-surface-muted p-4">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Phone number (e.g., +1234567890)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 rounded-full border border-surface bg-surface px-4 py-3 text-primary placeholder:text-secondary outline-none focus:border-transparent focus:ring-2 focus:ring-green-400"
            />
            <input
              type="text"
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1 rounded-full border border-surface bg-surface px-4 py-3 text-primary placeholder:text-secondary outline-none focus:border-transparent focus:ring-2 focus:ring-green-400"
            />
            <button
              onClick={sendMessage}
              disabled={!phone || !message}
              className="flex items-center space-x-2 rounded-full border border-transparent bg-green-600 px-6 py-3 font-medium text-white transition-all duration-200 hover:bg-green-500 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <span>Send</span>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
