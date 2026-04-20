import { FiCheck, FiZap, FiTarget, FiBox, FiActivity, FiX, FiUsers, FiHeadphones } from 'react-icons/fi';
import { PLAN_CONFIG } from '../config/plans';

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
  if (feature.id === 'prioritySupport') return plan === 'ENTERPRISE';
  if (feature.isLimit) return value > 0;
  return !!value;
};

const PricingSection = ({ onChoosePlan }) => {
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center mb-16 px-4">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-300">Pricing</p>
        <h2 className="mt-4 text-4xl font-extrabold text-white sm:text-5xl tracking-tight leading-none italic">Choose Your Protocol</h2>
        <p className="mt-6 text-lg text-blue-100/70 font-medium">
          Scale your enterprise communication with automated WhatsApp logic. Deploy in seconds.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-4 px-4 sm:px-0">
        {['FREE', 'BASIC', 'PRO', 'ENTERPRISE'].map((plan) => (
          <div
            key={plan}
            className={`relative flex h-full flex-col rounded-[2.5rem] border p-8 transition-all duration-500 hover:-translate-y-2 group ${
              plan === 'PRO'
                ? 'bg-gradient-to-b from-blue-600/20 to-slate-950/80 border-blue-500 shadow-[0_40px_100px_rgba(37,99,235,0.25)] ring-1 ring-blue-500/50'
                : 'bg-white/5 border-white/10 backdrop-blur-3xl hover:border-blue-500/30'
            }`}
          >
            {plan === 'PRO' && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-6 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-white shadow-lg shadow-blue-500/30">
                Performance Choice
              </div>
            )}

            <div className="mb-10">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300 mb-4">{plan}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white tracking-tighter">₹{PLAN_CONFIG[plan].price}</span>
                <span className="text-sm text-blue-100/50 font-bold">/m</span>
              </div>
            </div>

            <div className="flex-1 space-y-5 mb-10">
              {FEATURES_LIST.map((feature, idx) => {
                const enabled = isFeatureEnabled(plan, feature);
                const value = getFeatureValue(plan, feature);
                
                return (
                  <div key={idx} className={`flex items-center justify-between gap-3 ${enabled ? 'opacity-100' : 'opacity-30'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all duration-300 ${enabled ? 'bg-blue-600/10 text-blue-400 group-hover:bg-blue-600 group-hover:text-white' : 'bg-white/5 text-slate-500'}`}>
                        <feature.icon className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${enabled ? 'text-blue-50' : 'text-slate-500'}`}>
                          {feature.label}
                        </span>
                        {feature.isLimit && enabled && (
                          <span className="text-[10px] font-bold text-blue-400/80 mt-0.5">{value} {feature.id === 'maxFlows' ? 'Flows' : feature.id === 'maxMessages' ? 'Msgs' : 'Users'}</span>
                        )}
                      </div>
                    </div>
                    {enabled ? (
                      <FiCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <FiX className="h-4 w-4 text-slate-600/50 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => onChoosePlan(plan)}
              className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 ${
                plan === 'PRO'
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700'
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/5'
              }`}
            >
              Initialize {plan} Protocol
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PricingSection;
