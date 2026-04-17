import { useState, useEffect } from 'react';
import { FiCheck, FiZap, FiTarget, FiBox, FiActivity } from 'react-icons/fi';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const PLAN_FEATURES = {
  FREE: [
    { label: '1 Automated Flow', icon: FiBox },
    { label: '100 Messages Limit', icon: FiZap },
    { label: 'Basic Reports', icon: FiActivity },
  ],
  BASIC: [
    { label: '5 Automated Flows', icon: FiBox },
    { label: '1,000 Messages Limit', icon: FiZap },
    { label: 'Full Automation Access', icon: FiTarget },
  ],
  PRO: [
    { label: '15 Automated Flows', icon: FiBox },
    { label: '10,000 Messages Limit', icon: FiZap },
    { label: 'Marketing Campaigns', icon: FiTarget },
    { label: 'Advanced Analytics', icon: FiActivity },
  ],
  ENTERPRISE: [
    { label: 'Unlimited Flows', icon: FiBox },
    { label: 'Unlimited Messages', icon: FiZap },
    { label: 'Full System Access', icon: FiTarget },
    { label: 'Dedicated Support', icon: FiCheck },
  ],
};

const Pricing = () => {
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await api.get('/subscription/status');
      setSubscription(response.data);
    } catch (error) {
      console.error('Failed to fetch subscription', error);
    }
  };

  const handleSubscribe = async (plan) => {
    setLoadingPlan(plan);
    try {
      const { data } = await api.post('/subscription/create', { plan });
      
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_S9xWhhATlONDCZ',
        amount: data.amount,
        currency: data.currency,
        name: 'Ematix Platform',
        description: `${plan} Subscription Plan`,
        order_id: data.orderId,
        handler: async (response) => {
          try {
            await api.post('/subscription/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            alert('Payment Successful! Your plan has been activated.');
            window.location.reload();
          } catch (err) {
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: '#2563eb',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Subscription error', error);
      alert('Failed to initiate subscription');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      <header className="text-center space-y-4 pt-10">
        <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight italic">Choose Your Plan</h1>
        <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">
          Scale your business with automated WhatsApp communication. High performance guaranteed.
        </p>
      </header>

      {subscription && (
        <div className="max-w-4xl mx-auto bg-blue-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
             <div>
                <p className="text-blue-100/80 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Current Subscription</p>
                <div className="flex items-center gap-4">
                  <h2 className="text-4xl font-black italic uppercase">{subscription.plan}</h2>
                  <span className="px-4 py-1.5 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-widest">{subscription.status}</span>
                </div>
                <p className="mt-4 text-blue-100/60 font-medium">Valid until: {new Date(subscription.expiryDate).toLocaleDateString()}</p>
             </div>
             <div className="w-full md:w-64 space-y-4">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>Usage: {subscription.usage.messagesUsed} / {subscription.limits.maxMessages === Infinity ? '∞' : subscription.limits.maxMessages} messages</span>
                </div>
                <div className="h-2 w-full bg-blue-800 rounded-full overflow-hidden">
                   <div 
                    className="h-full bg-white transition-all duration-1000" 
                    style={{ width: `${Math.min(100, (subscription.usage.messagesUsed / (subscription.limits.maxMessages || 1)) * 100)}%` }} 
                   />
                </div>
             </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 px-4 lg:px-0">
        {['FREE', 'BASIC', 'PRO', 'ENTERPRISE'].map((plan) => (
          <div 
            key={plan}
            className={`saas-card p-10 flex flex-col h-full group hover:-translate-y-2 transition-all duration-500 ${subscription?.plan === plan ? 'border-blue-600 ring-2 ring-blue-600/20' : ''}`}
          >
            <div className="mb-8">
              <h3 className="text-xl font-black text-slate-900 italic uppercase mb-2 group-hover:text-blue-600 transition-colors">{plan}</h3>
              <div className="flex items-baseline gap-1 mt-4">
                <span className="text-4xl font-black tracking-tighter">₹{plan === 'FREE' ? '0' : plan === 'BASIC' ? '999' : plan === 'PRO' ? '2499' : '4999'}</span>
                <span className="text-slate-400 text-xs font-bold">/ month</span>
              </div>
            </div>

            <div className="flex-1 space-y-4 mb-10">
              {PLAN_FEATURES[plan].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <feature.icon className="h-3 w-3" />
                  </div>
                  <span className="text-sm font-bold text-slate-600">{feature.label}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleSubscribe(plan)}
              disabled={loadingPlan === plan || subscription?.plan === plan}
              className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                subscription?.plan === plan 
                  ? 'bg-emerald-50 text-emerald-600 cursor-default'
                  : 'btn-primary shadow-xl shadow-blue-500/10 active:scale-95'
              }`}
            >
              {loadingPlan === plan 
                ? 'Processing...' 
                : subscription?.plan === plan 
                  ? 'Current Plan' 
                  : plan === 'FREE' ? 'Get Started' : 'Subscribe Now'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Pricing;
