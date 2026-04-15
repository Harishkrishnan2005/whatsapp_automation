import GlassPanel from '../ui/GlassPanel';

const ChartWrapper = ({ title, subtitle, rightSlot, children, className = '' }) => {
  return (
    <GlassPanel className={`p-6 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-slate-300">{subtitle}</p> : null}
        </div>
        {rightSlot}
      </div>
      {children}
    </GlassPanel>
  );
};

export default ChartWrapper;
