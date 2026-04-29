import { FEATURE_LIST, plans, PLAN_LEVELS } from '../data/pricingPlans';

console.log('Pricing component loaded');

const getPlanLevel = (planName) => PLAN_LEVELS[planName] ?? 0;

const renderFeatureValue = (value) => {
  if (value === false) {
    return (
      <span className="flex items-center gap-2 text-gray-400">
        <span className="text-red-400">✖</span>
        <span>Not Available</span>
      </span>
    );
  }

  if (value === true) {
    return <span className="text-green-400">✔</span>;
  }

  if (typeof value === 'object' && value?.included) {
    return (
      <span className="flex items-center gap-2 text-white">
        <span className="text-green-400">✔</span>
        <span>{value.text}</span>
      </span>
    );
  }

  return <span className="text-sm font-medium text-white">{value}</span>;
};

const PricingPlans = ({
  currentPlan = 'BASIC',
  loadingPlan = null,
  onPlanAction,
  title = 'Choose Your Plan',
  description = 'Scale your automation with the right tools.',
}) => {
  return (
    <section className="mx-auto w-full max-w-7xl">
      <header className="mx-auto mb-12 max-w-3xl text-center">
        <h1 className="text-4xl font-black text-white md:text-6xl">{title}</h1>
        <p className="mt-4 text-lg text-gray-400">{description}</p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.name === currentPlan;
          const isHigher = getPlanLevel(plan.name) > getPlanLevel(currentPlan);
          const buttonLabel = isCurrent ? 'Current Plan' : isHigher ? 'Upgrade' : 'Not Available';
          const isDisabled = !isHigher;

          return (
            <article
              key={plan.name}
              className={[
                'flex h-full flex-col rounded-xl bg-slate-900 p-8',
                plan.highlight
                  ? 'border-2 border-blue-500 shadow-xl scale-105'
                  : 'border border-slate-800',
              ].join(' ')}
            >
              <div className="mb-8">
                <p className="text-sm font-bold tracking-[0.3em] text-gray-400">{plan.name}</p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="text-sm text-gray-400">/mo</span>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                {FEATURE_LIST.map((feature) => (
                  <div key={feature.key} className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <span className="text-sm text-white">{feature.label}</span>
                    {renderFeatureValue(plan.features[feature.key])}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => onPlanAction?.(plan.name)}
                disabled={isDisabled || loadingPlan === plan.name}
                className={[
                  'mt-8 rounded-xl px-4 py-3 text-sm font-bold transition',
                  isCurrent
                    ? 'cursor-not-allowed bg-slate-800 text-gray-400'
                    : isHigher
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'cursor-not-allowed bg-slate-800 text-red-400',
                ].join(' ')}
              >
                {loadingPlan === plan.name ? 'Processing...' : buttonLabel}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default PricingPlans;
