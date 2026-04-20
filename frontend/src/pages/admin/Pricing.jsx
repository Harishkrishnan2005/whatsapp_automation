import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FiCheck, FiZap, FiTarget, FiBox, FiActivity, FiX, FiUsers, FiHeadphones, FiAlertCircle } from 'react-icons/fi';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { PLAN_CONFIG } from '../../config/plans';

const FEATURES_LIST = [
  { id: 'maxFlows', label: 'Automated Flows', icon: FiBox, isLimit: true },
  { id: 'maxMessages', label: 'Monthly Messages', icon: FiZap, isLimit: true },
  { id: 'maxUsers', label: 'Staff Users', icon: FiUsers, isLimit: true },
  { id: 'allowCampaigns', label: 'Marketing Campaigns', icon: FiTarget },
  { id: 'allowAutomation', label: 'Custom Automation', icon: FiZap },
  { id: 'allowAdvancedAnalytics', label: 'Advanced Analytics', icon: FiActivity },
  { id: 'prioritySupport', label: 'Priority Support', icon: FiHeadphones },
];

const getFeatureValue = (plan, feature) => {
  const config = PLAN_CONFIG[plan];
  if (!config) return null;

  const value = config[feature.id];
  
  if (feature.isLimit) {
    return value === Infinity ? 'Unlimited' : value;
  }
  
  return value ? 'Enabled' : 'Not Included';
};

const isFeatureEnabled = (plan, feature) => {
  const config = PLAN_CONFIG[plan];
  if (!config) return false;
  
  const value = config[feature.id];
  if (feature.id === 'prioritySupport') return plan === 'ENTERPRISE'; // Manual override for non-config features
  
  if (feature.isLimit) {
    return value > 0;
  }
  return !!value;
};

const Pricing = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [subscription, setSubscription] = useState(null);
  
  const featureLocked = location.state?.featureLocked;
  const lockedFeatureLabel = FEATURES_LIST.find(f => f.id === featureLocked)?.label || featureLocked;

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
      
      {featureLocked && (
        <div className="max-w-4xl mx-auto bg-amber-50 border border-amber-200 p-6 rounded-3xl flex items-center gap-4 text-amber-800 animate-bounce">
          <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
            <FiAlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-black uppercase text-xs tracking-widest">Upgrade Required</h4>
            <p className="text-sm font-medium">The feature <span className="font-black italic underline">"{lockedFeatureLabel}"</span> is not included in your current plan. Please upgrade to continue.</p>
          </div>
        </div>
      )}

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
                <p className="mt-4 text-blue-100/60 font-medium">Valid until: {subscription.expiryDate ? new Date(subscription.expiryDate).toLocaleDateString() : 'Active'}</p>
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
              {FEATURES_LIST.map((feature, idx) => {
                const enabled = isFeatureEnabled(plan, feature);
                const value = getFeatureValue(plan, feature);
                
                return (
                  <div key={idx} className={`flex items-center justify-between gap-3 ${enabled ? 'opacity-100' : 'opacity-40'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`h-6 w-6 rounded-lg flex items-center justify-center transition-colors ${enabled ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <feature.icon className="h-3 w-3" />
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-[11px] font-black uppercase tracking-tight ${enabled ? 'text-slate-700' : 'text-slate-400'}`}>
                          {feature.label}
                        </span>
                        {feature.isLimit && enabled && (
                          <span className="text-[10px] font-bold text-blue-600/70 -mt-0.5">{value} included</span>
                        )}
                      </div>
                    </div>
                    {enabled ? (
                      <FiCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <FiX className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                    )}
                  </div>
                );
              })}
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
