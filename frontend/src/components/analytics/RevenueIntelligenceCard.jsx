import GlassPanel from '../ui/GlassPanel';
import SparklineChart from '../charts/SparklineChart';

const RevenueIntelligenceCard = ({ revenue = 0, growth = 0, previous = 0, sparkline = [] }) => {
  const positive = growth >= 0;

  return (
    <GlassPanel className="p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-cyan-200">Revenue Intelligence</p>
      <h3 className="mt-2 text-4xl font-extrabold text-white">${Number(revenue || 0).toLocaleString()}</h3>
      <div className="mt-2 flex items-center gap-3">
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${positive ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200' : 'border-rose-400/20 bg-rose-500/10 text-rose-200'}`}>
          {positive ? '?' : '?'} {Math.abs(growth).toFixed(2)}%
        </span>
        <span className="text-xs text-slate-300">Prev period: ${Number(previous || 0).toLocaleString()}</span>
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/35 px-3 py-2">
        <SparklineChart data={sparkline.map((point) => ({ value: Number(point || 0) }))} color="#22d3ee" />
      </div>
    </GlassPanel>
  );
};

export default RevenueIntelligenceCard;
