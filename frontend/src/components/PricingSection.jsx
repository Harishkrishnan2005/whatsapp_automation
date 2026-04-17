import { FiCheck } from 'react-icons/fi';

const plans = [
  {
    id: 'FREE',
    name: 'Free',
    price: 'Rs 0',
    subtitle: 'Best for trying the platform',
    features: ['1 chatbot flow', '100 messages/month', 'Manual chat support'],
    cta: 'Choose Plan',
  },
  {
    id: 'BASIC',
    name: 'Basic',
    price: 'Rs 999',
    subtitle: 'For small businesses getting started',
    features: ['5 chatbot flows', '1,000 messages/month', 'Order / Booking enabled'],
    cta: 'Choose Plan',
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 'Rs 2,499',
    subtitle: 'Best fit for growing teams',
    features: ['15 chatbot flows', '10,000 messages/month', 'Campaigns + Analytics', 'Multi staff'],
    cta: 'Choose Plan',
    featured: true,
    badge: 'Most Popular',
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: 'Rs 4,999',
    subtitle: 'For large operations and deeper automation',
    features: ['Unlimited everything', 'Priority support', 'API access'],
    cta: 'Choose Plan',
  },
];

const PricingSection = ({ onChoosePlan }) => {
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-300">Pricing</p>
        <h2 className="mt-4 text-4xl font-bold text-white sm:text-5xl">Plans built for every stage</h2>
        <p className="mt-4 text-lg text-blue-100/80">
          Start free, upgrade as your conversations grow, and move to Enterprise when you need full scale.
        </p>
      </div>

      <div className="mt-14 grid gap-6 lg:grid-cols-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative flex h-full flex-col rounded-[2rem] border bg-white/8 p-7 shadow-[0_30px_80px_rgba(15,23,42,0.35)] backdrop-blur-xl transition duration-300 hover:-translate-y-2 hover:border-blue-300/45 ${
              plan.featured
                ? 'scale-[1.03] border-2 border-blue-600 bg-gradient-to-b from-blue-500/20 to-slate-950/80'
                : 'border-white/12'
            }`}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-blue-300/50 bg-blue-500 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                {plan.badge}
              </div>
            )}

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-200">{plan.name}</p>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="pb-1 text-sm text-blue-100/70">/month</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-blue-100/75">{plan.subtitle}</p>
            </div>

            <ul className="mt-8 space-y-3 text-sm text-blue-50/90">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span className="mt-0.5 rounded-full bg-blue-500/20 p-1 text-blue-200">
                    <FiCheck className="h-4 w-4" />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => onChoosePlan(plan.id)}
              className={`mt-8 inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition ${
                plan.featured
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white/10 text-white hover:bg-white/16'
              }`}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PricingSection;
