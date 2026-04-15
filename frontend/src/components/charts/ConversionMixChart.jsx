import { Pie, PieChart, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip } from 'recharts';

const ConversionMixChart = ({ conversion = [] }) => {
  const total = conversion.reduce((sum, item) => sum + Number(item.value || 0), 0);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={conversion}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            animationDuration={500}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(2,6,23,0.95)',
              border: '1px solid rgba(148,163,184,0.2)',
              borderRadius: 12,
              color: '#e2e8f0',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <ResponsiveContainer width="100%" height={250}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="25%"
          outerRadius="90%"
          barSize={14}
          data={conversion.map((item) => ({ ...item, fill: item.color }))}
        >
          <RadialBar dataKey="value" background clockWise animationDuration={500} />
          <Tooltip
            contentStyle={{
              background: 'rgba(2,6,23,0.95)',
              border: '1px solid rgba(148,163,184,0.2)',
              borderRadius: 12,
              color: '#e2e8f0',
            }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="md:col-span-2 rounded-xl border border-white/10 bg-slate-900/35 px-4 py-3 text-sm text-slate-300">
        Total conversion events: <span className="font-semibold text-white">{total.toLocaleString()}</span>
      </div>
    </div>
  );
};

export default ConversionMixChart;
