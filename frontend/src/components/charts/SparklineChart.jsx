import { Line, LineChart, ResponsiveContainer } from 'recharts';

const SparklineChart = ({ data = [], color = '#22d3ee' }) => {
  return (
    <ResponsiveContainer width="100%" height={60}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default SparklineChart;
