const FunnelChart = ({ steps = [] }) => {
  const max = Math.max(...steps.map((step) => Number(step.value || 0)), 1);

  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const value = Number(step.value || 0);
        const next = Number(steps[index + 1]?.value || value);
        const dropOff = value ? Math.max(0, ((value - next) / value) * 100) : 0;
        const width = Math.max(26, (value / max) * 100);
        const heatClass = dropOff > 30 ? 'from-rose-500/50 to-rose-700/35' : dropOff > 15 ? 'from-amber-500/40 to-amber-700/30' : 'from-cyan-500/45 to-blue-600/35';

        return (
          <div key={step.id || step.label}>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
              <span>{step.label}</span>
              <span>{value.toLocaleString()} {index < steps.length - 1 ? `| Drop-off ${dropOff.toFixed(1)}%` : ''}</span>
            </div>
            <div className="h-10 rounded-xl border border-white/10 bg-slate-900/35 p-1">
              <div
                className={`h-full rounded-lg bg-gradient-to-r ${heatClass} px-3 text-sm font-semibold text-white flex items-center transition-all duration-500`}
                style={{ width: `${width}%` }}
                title={`${step.label}: ${value}`}
              >
                {value.toLocaleString()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FunnelChart;
