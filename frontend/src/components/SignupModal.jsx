import { useEffect, useMemo, useState } from 'react';
import { FiLoader, FiX } from 'react-icons/fi';
import api from '../utils/api';

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const initialState = {
  businessName: '',
  email: '',
  phone: '',
  password: '',
  businessType: 'E_COMMERCE',
};

const planTitles = {
  FREE: 'Free',
  BASIC: 'Basic',
  PRO: 'Pro',
  ENTERPRISE: 'Enterprise',
};

const fieldClass =
  'landing-input rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white caret-white outline-none transition-all placeholder:text-white/40 focus:border-blue-400 focus:bg-slate-900 focus:ring-4 focus:ring-blue-500/10';

const selectClass =
  'landing-input rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition-all focus:border-blue-400 focus:bg-slate-900 focus:ring-4 focus:ring-blue-500/10';

const SignupModal = ({ open, mode = 'signup', selectedPlan = 'FREE', onClose }) => {
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!open) {
      setForm(initialState);
      setLoading(false);
      setError('');
      setSuccess('');
    }
  }, [open]);

  const title = useMemo(() => {
    if (mode === 'signup') return 'Create your free admin account';
    return `Choose the ${planTitles[selectedPlan] || selectedPlan} plan`;
  }, [mode, selectedPlan]);

  if (!open) return null;

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const redirectToLogin = (path = '/admin/login') => {
    setTimeout(() => {
      window.location.href = path;
    }, 900);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'signup') {
        const response = await api.post('/public/register', form);
        setSuccess(response.data?.message || 'Account created successfully.');
        redirectToLogin(response.data?.redirectTo || '/admin/login');
        return;
      }

      const createRes = await api.post('/public/subscription/create', {
        ...form,
        plan: selectedPlan,
      });

      if (createRes.data?.free) {
        setSuccess(createRes.data?.message || 'Plan activated successfully.');
        redirectToLogin(createRes.data?.redirectTo || '/admin/login');
        return;
      }

      const razorpayReady = await loadRazorpay();
      if (!razorpayReady || !window.Razorpay) {
        throw new Error('Razorpay checkout could not be loaded.');
      }

      const razorpay = new window.Razorpay({
        key: createRes.data.keyId,
        amount: createRes.data.amount,
        currency: createRes.data.currency,
        order_id: createRes.data.orderId,
        name: 'WhatsApp Automation',
        description: `${planTitles[selectedPlan]} plan subscription`,
        theme: {
          color: '#2563eb',
        },
        prefill: {
          name: form.businessName,
          email: form.email,
          contact: form.phone,
        },
        handler: async (paymentResponse) => {
          const verifyRes = await api.post('/public/subscription/verify', {
            razorpayOrderId: paymentResponse.razorpay_order_id,
            razorpayPaymentId: paymentResponse.razorpay_payment_id,
            razorpaySignature: paymentResponse.razorpay_signature,
          });

          setSuccess(verifyRes.data?.message || 'Payment verified successfully.');
          redirectToLogin(verifyRes.data?.redirectTo || '/admin/login');
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      });

      razorpay.open();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Unable to complete your request right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-slate-950/95 p-8 shadow-[0_35px_90px_rgba(15,23,42,0.6)]">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-300">
              {mode === 'signup' ? 'Free Onboarding' : `Plan: ${planTitles[selectedPlan] || selectedPlan}`}
            </p>
            <h3 className="mt-3 text-3xl font-bold text-white">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-blue-100/75">
              Enter your business details and we’ll set up your admin portal access.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-white transition hover:bg-white/10"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              value={form.businessName}
              onChange={(e) => handleChange('businessName', e.target.value)}
              placeholder="Business name"
              className={fieldClass}
              required
            />
            <select
              value={form.businessType}
              onChange={(e) => handleChange('businessType', e.target.value)}
              className={selectClass}
            >
              <option value="E_COMMERCE">E-Commerce</option>
              <option value="BOOKING">Booking</option>
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="Email address"
              className={fieldClass}
              required
            />
            <input
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="Phone number"
              className={fieldClass}
              required
            />
          </div>

          <input
            type="password"
            value={form.password}
            onChange={(e) => handleChange('password', e.target.value)}
            placeholder="Create password"
            className={`w-full ${fieldClass}`}
            required
          />

          {error && <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>}
          {success && <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{success}</div>}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <FiLoader className="h-4 w-4 animate-spin" />}
            {mode === 'signup' ? 'Create Free Account' : `Continue with ${planTitles[selectedPlan] || selectedPlan}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignupModal;
