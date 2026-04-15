import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const OrdersAnalyticsChart = ({ data = [] }) => {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barGap={12}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
        <XAxis dataKey="name" stroke="rgba(186,230,253,0.7)" />
        <YAxis stroke="rgba(186,230,253,0.7)" />
        <Tooltip
          cursor={{ fill: 'rgba(34,211,238,0.08)' }}
          contentStyle={{
            background: 'rgba(2,6,23,0.95)',
            border: '1px solid rgba(148,163,184,0.2)',
            borderRadius: 12,
            color: '#e2e8f0',
          }}
        />
        <Legend />
        <Bar dataKey="pending" fill="#f59e0b" radius={[8, 8, 0, 0]} />
        <Bar dataKey="confirmed" fill="#34d399" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default OrdersAnalyticsChart;
