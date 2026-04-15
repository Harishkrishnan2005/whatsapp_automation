import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const CustomerGrowthChart = ({ data = [] }) => {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="customerFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.42} />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
        <XAxis dataKey="name" stroke="rgba(186,230,253,0.7)" />
        <YAxis stroke="rgba(186,230,253,0.7)" />
        <Tooltip
          contentStyle={{
            background: 'rgba(2,6,23,0.95)',
            border: '1px solid rgba(148,163,184,0.2)',
            borderRadius: 12,
            color: '#e2e8f0',
          }}
        />
        <Area
          type="monotone"
          dataKey="customers"
          stroke="#22d3ee"
          strokeWidth={2.5}
          fill="url(#customerFill)"
          activeDot={{ r: 6, fill: '#67e8f9' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default CustomerGrowthChart;
