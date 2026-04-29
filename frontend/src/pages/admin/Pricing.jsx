import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PricingPlans from '../../components/PricingPlans';
import api from '../../utils/api';

const Pricing = () => {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await api.get('/admin/billing/subscription/status');
        setSubscription(response.data);
      } catch (error) {
        console.error('Failed to fetch subscription', error);
      }
    };

    fetchSubscription();
  }, []);

  const currentPlan = subscription?.plan || 'BASIC';
  const monthlyLimit = subscription?.limits?.monthlyMessages;
  const usageCount = subscription?.usage?.messagesUsed ?? 0;
  const usagePercent = monthlyLimit && monthlyLimit !== Infinity
    ? Math.min(100, (usageCount / monthlyLimit) * 100)
    : 0;

  const handlePlanAction = async (planName) => {
    if (planName === currentPlan) {
      return;
    }

    setLoadingPlan(planName);

    try {
      const { data } = await api.post('/admin/billing/subscription/create', { plan: planName });

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        name: 'WhatsApp Automation',
        description: `${planName} Subscription`,
        order_id: data.orderId,
        handler: async (response) => {
          try {
            const verifyResponse = await api.post('/admin/billing/subscription/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              plan: planName,
            });
            if (verifyResponse.data?.success) {
              navigate(verifyResponse.data?.redirectUrl || '/admin/dashboard');
              return;
            }
            window.location.href = '/admin/dashboard';
          } catch (error) {
            alert('Payment verification failed.');
          }
        },
        theme: { color: '#2563eb' },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to initiate subscription');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-white md:px-8 md:py-10">
      {subscription && (
        <section className="mx-auto mb-10 flex max-w-5xl flex-col gap-5 rounded-xl border border-slate-800 bg-slate-900 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold tracking-[0.3em] text-gray-400">CURRENT PLAN</p>
            <h2 className="mt-3 text-2xl font-black text-white">{subscription.plan}</h2>
            <p className="mt-2 text-sm text-gray-400">
              Expires: {subscription.expiryDate ? new Date(subscription.expiryDate).toLocaleDateString() : 'N/A'}
            </p>
          </div>

          <div className="w-full max-w-md">
            <div className="mb-2 flex items-center justify-between text-sm text-gray-400">
              <span>Messages Used</span>
              <span>
                {usageCount} / {monthlyLimit === Infinity ? 'Unlimited' : monthlyLimit ?? 'N/A'}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-800">
              <div className="h-2 rounded-full bg-green-400" style={{ width: `${usagePercent}%` }} />
            </div>
          </div>
        </section>
      )}

      <PricingPlans
        currentPlan={currentPlan}
        loadingPlan={loadingPlan}
        onPlanAction={handlePlanAction}
      />
    </div>
  );
};

export default Pricing;
