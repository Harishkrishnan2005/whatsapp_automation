import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowRight,
  FiBarChart2,
  FiCalendar,
  FiCpu,
  FiMessageCircle,
  FiUsers,
} from 'react-icons/fi';
import PricingSection from '../components/PricingSection';
import SignupModal from '../components/SignupModal';
import ContactForm from '../components/ContactForm';

const features = [
  {
    title: 'WhatsApp Automation',
    description: 'Create dynamic chatbot journeys that answer customers instantly and keep conversations moving.',
    icon: FiMessageCircle,
  },
  {
    title: 'CRM & Customer Management',
    description: 'Track customer profiles, notes, assignments, and conversation history in one place.',
    icon: FiUsers,
  },
  {
    title: 'Order & Booking System',
    description: 'Support both ecommerce and booking businesses with flows tailored to their operations.',
    icon: FiCalendar,
  },
  {
    title: 'Advanced Analytics',
    description: 'Measure messages, orders, bookings, conversion, and team performance with clean dashboards.',
    icon: FiBarChart2,
  },
];

const steps = [
  'Create your business account',
  'Setup chatbot flows',
  'Connect WhatsApp',
  'Start automating',
];

const HomePage = () => {
  const [modalState, setModalState] = useState({ open: false, mode: 'signup', plan: 'FREE' });

  const stats = useMemo(
    () => [
      { value: '2x faster', label: 'customer response time' },
      { value: '10k+', label: 'messages handled monthly' },
      { value: 'Multi-model', label: 'supports orders and bookings' },
    ],
    []
  );

  const openSignup = () => setModalState({ open: true, mode: 'signup', plan: 'FREE' });
  const openPlan = (plan) => setModalState({ open: true, mode: 'plan', plan });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.35),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(29,78,216,0.28),_transparent_26%),linear-gradient(180deg,_#081127_0%,_#0b1731_45%,_#081121_100%)] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/55 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-500/20 p-2 text-blue-200">
              <FiCpu className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-300">SaaS Platform</p>
              <p className="text-lg font-bold text-white">WhatsApp Automation</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openSignup}
              className="hidden rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 sm:inline-flex"
            >
              Get Started
            </button>
            <Link
              to="/admin/login"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.38em] text-blue-300">Smart automation</p>
              <h1 className="mt-6 text-5xl font-bold leading-tight text-white sm:text-6xl">
                Smart WhatsApp Automation Platform for Businesses
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-100/80">
                Automate customer conversations, manage orders, bookings, and grow your business effortlessly.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={openSignup}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Get Started
                  <FiArrowRight className="h-4 w-4" />
                </button>
                <Link
                  to="/admin/login"
                  className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Sign In
                </Link>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className="mt-2 text-sm text-blue-100/70">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-[0_35px_90px_rgba(15,23,42,0.45)] backdrop-blur-xl">
              <div className="rounded-[1.5rem] border border-blue-400/20 bg-slate-950/45 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-blue-300">Automation Console</p>
                    <h3 className="mt-3 text-2xl font-semibold text-white">One system for chat, sales, and service</h3>
                  </div>
                  <div className="rounded-2xl bg-blue-500/15 p-3 text-blue-200">
                    <FiMessageCircle className="h-6 w-6" />
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-blue-100/75">Incoming</p>
                    <p className="mt-2 text-white">Customer: “I want to book a slot for tomorrow.”</p>
                  </div>
                  <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4">
                    <p className="text-sm text-blue-100/80">Automation</p>
                    <p className="mt-2 text-white">Bot: “Sure, let’s continue with your appointment flow and collect your details.”</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm text-blue-100/75">Orders / Booking</p>
                      <p className="mt-2 text-xl font-semibold text-white">Unified flow engine</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm text-blue-100/75">Analytics</p>
                      <p className="mt-2 text-xl font-semibold text-white">Live conversion insight</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-300">Features</p>
            <h2 className="mt-4 text-4xl font-bold text-white sm:text-5xl">Everything your operations team needs</h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-[1.75rem] border border-white/10 bg-white/6 p-6 backdrop-blur-xl transition hover:-translate-y-2 hover:border-blue-300/40">
                  <div className="inline-flex rounded-2xl bg-blue-500/15 p-3 text-blue-200">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-white">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-blue-100/75">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/6 p-8 backdrop-blur-xl lg:p-12">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-300">How It Works</p>
              <h2 className="mt-4 text-4xl font-bold text-white sm:text-5xl">Go live in four simple steps</h2>
            </div>
            <div className="mt-12 grid gap-5 lg:grid-cols-4">
              {steps.map((step, index) => (
                <div key={step} className="rounded-[1.5rem] border border-white/10 bg-slate-950/35 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                    {index + 1}
                  </div>
                  <p className="mt-5 text-lg font-semibold text-white">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <PricingSection onChoosePlan={openPlan} />
        <ContactForm />
      </main>

      <footer className="border-t border-white/10 px-4 py-8 text-center text-sm text-blue-100/60 sm:px-6 lg:px-8">
        Smart WhatsApp Automation Platform for Businesses
      </footer>

      <SignupModal
        open={modalState.open}
        mode={modalState.mode}
        selectedPlan={modalState.plan}
        onClose={() => setModalState((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export default HomePage;
