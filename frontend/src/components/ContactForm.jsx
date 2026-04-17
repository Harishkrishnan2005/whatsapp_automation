import { useState } from 'react';
import { FiLoader } from 'react-icons/fi';
import api from '../utils/api';

const fieldClass =
  'landing-input w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white caret-white outline-none transition-all placeholder:text-white/40 focus:border-blue-400 focus:bg-slate-900 focus:ring-4 focus:ring-blue-500/10';

const ContactForm = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', text: '' });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setStatus({ type: '', text: '' });

    try {
      const response = await api.post('/public/contact', form);
      setStatus({ type: 'success', text: response.data?.message || 'Message sent successfully.' });
      setForm({ name: '', email: '', message: '' });
    } catch (error) {
      setStatus({
        type: 'error',
        text: error?.response?.data?.message || 'Unable to send your message right now.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid gap-10 rounded-[2rem] border border-white/10 bg-white/6 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.35)] backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr] lg:p-12">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-300">Contact</p>
          <h2 className="mt-4 text-4xl font-bold text-white sm:text-5xl">Let’s launch your automation stack</h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-blue-100/80">
            Have questions about setup, pricing, or rollout? Send us a message and we’ll reply with the right path for your business.
          </p>
          <div className="mt-8 space-y-3 text-sm text-blue-100/75">
            <p>Email: hk1784048@gmail.com</p>
            <p>Support: onboarding, pricing, WhatsApp automation, CRM, analytics</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Your name"
            className={fieldClass}
            required
          />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="Your email"
            className={fieldClass}
            required
          />
          <textarea
            value={form.message}
            onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
            placeholder="Tell us about your business and what you want to automate"
            rows={5}
            className={fieldClass}
            required
          />

          {status.text && (
            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                status.type === 'success'
                  ? 'border border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
                  : 'border border-rose-400/25 bg-rose-500/10 text-rose-100'
              }`}
            >
              {status.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <FiLoader className="h-4 w-4 animate-spin" />}
            Send Message
          </button>
        </form>
      </div>
    </section>
  );
};

export default ContactForm;
