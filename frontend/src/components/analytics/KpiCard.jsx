import { useEffect, useMemo, useState } from 'react';
import SparklineChart from '../charts/SparklineChart';
import GlassPanel from '../ui/GlassPanel';

const getTrendStyles = (trend = 0) => {
  if (trend >= 0) {
    return {
      badge: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200',
      spark: '#34d399',
      arrow: '?',
    };
  }

  return {
    badge: 'border-rose-400/20 bg-rose-500/10 text-rose-200',
    spark: '#fb7185',
    arrow: '?',
  };
};

const KpiCard = ({ label, value = 0, trend = 0, sparkline = [] }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frameId;
    const start = performance.now();
    const duration = 700;
    const target = Number(value || 0);

    const update = (time) => {
      const progress = Math.min((time - start) / duration, 1);
      setDisplayValue(Math.round(target * progress));
      if (progress < 1) {
        frameId = requestAnimationFrame(update);
      }
    };

    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [value]);

  const styles = useMemo(() => getTrendStyles(trend), [trend]);

  return (
    <GlassPanel className="p-5 hover:-translate-y-0.5 hover:shadow-2xl">
      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-3xl font-bold text-white">{displayValue.toLocaleString()}</p>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${styles.badge}`}>
          {styles.arrow} {Math.abs(Number(trend || 0)).toFixed(1)}%
        </span>
      </div>
      <div className="mt-2">
        <SparklineChart
          color={styles.spark}
          data={sparkline.map((point, idx) => ({ value: Number(point || 0), idx }))}
        />
      </div>
    </GlassPanel>
  );
};

export default KpiCard;
