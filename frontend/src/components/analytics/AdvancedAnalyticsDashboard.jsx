import { lazy, Suspense, useMemo } from 'react';
import { motion } from 'framer-motion';
import useAnalyticsData from '../../hooks/useAnalyticsData';
import KpiCard from './KpiCard';
import RevenueIntelligenceCard from './RevenueIntelligenceCard';
import FunnelChart from '../charts/FunnelChart';
import ChartWrapper from '../charts/ChartWrapper';
import GlassPanel from '../ui/GlassPanel';
import SkeletonBlock from '../ui/SkeletonBlock';

const CustomerGrowthChart = lazy(() => import('../charts/CustomerGrowthChart'));
const OrdersAnalyticsChart = lazy(() => import('../charts/OrdersAnalyticsChart'));
const ConversionMixChart = lazy(() => import('../charts/ConversionMixChart'));

const chartSkeleton = <SkeletonBlock className="h-[280px] w-full" />;

const AdvancedAnalyticsDashboard = () => {
  const {
    analytics,
    campaigns,
    engagement,
    customerSeries,
    orderSeries,
    funnelSteps,
    loading,
    error,
  } = useAnalyticsData();

  const formatNumber = (value) => Number(value ?? 0).toLocaleString();

  const conversionData = useMemo(() => {
    if (!analytics) return [];
    return [
      { name: 'Confirmed', value: Number(analytics.orders?.confirmed || 0), color: '#34d399' },
      { name: 'Pending', value: Number(analytics.orders?.pending || 0), color: '#f59e0b' },
      { name: 'Failed', value: Number(analytics.orders?.failed || 0), color: '#fb7185' },
    ];
  }, [analytics]);

  const revenueSummary = useMemo(() => {
    const revenue = Number(analytics?.revenue?.estimated || 0);
    const previous = Math.max(0, Math.round(revenue * 0.86));
    const growth = previous ? ((revenue - previous) / previous) * 100 : 0;
    return {
      current: revenue,
      previous,
      growth,
      sparkline: [
        Math.round(revenue * 0.45),
        Math.round(revenue * 0.54),
        Math.round(revenue * 0.58),
        Math.round(revenue * 0.62),
        Math.round(revenue * 0.74),
        revenue,
      ],
    };
  }, [analytics]);

  const kpis = useMemo(() => {
    if (!analytics) return [];
    return [
      {
        id: 'customers',
        label: 'Total Customers',
        value: analytics.customers?.total || 0,
        trend: 7.8,
        sparkline: customerSeries.map((item) => item.customers),
      },
      {
        id: 'new_customers',
        label: 'New Customers',
        value: analytics.customers?.new || 0,
        trend: 5.2,
        sparkline: [4, 6, 8, 9, 10, analytics.customers?.new || 0],
      },
      {
        id: 'conversion',
        label: 'Conversion Rate',
        value: Number(analytics.customers?.conversionRate || 0),
        trend: 2.3,
        sparkline: [12, 16, 18, 20, 24, Number(analytics.customers?.conversionRate || 0)],
      },
      {
        id: 'orders',
        label: 'Total Orders',
        value: analytics.orders?.total || 0,
        trend: -1.4,
        sparkline: [18, 16, 21, 19, 17, analytics.orders?.total || 0],
      },
    ];
  }, [analytics, customerSeries]);

  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 md:p-8">
        <div className="mb-8 rounded-2xl border border-white/10 bg-slate-950/35 p-6 backdrop-blur-md">
          <SkeletonBlock className="h-8 w-64" />
          <SkeletonBlock className="mt-3 h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <SkeletonBlock key={idx} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 md:p-8 text-white">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-8 rounded-2xl border border-white/10 bg-slate-950/35 p-6 shadow-xl backdrop-blur-md"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-200">Insights Hub</p>
        <h1 className="mt-2 text-3xl font-extrabold text-white md:text-4xl">Advanced Analytics</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300 md:text-base">
          Explore customer behavior, campaign effectiveness, and operational throughput with a clearer visual breakdown.
        </p>
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            trend={kpi.trend}
            sparkline={kpi.sparkline}
          />
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <ChartWrapper title="Customer Growth" subtitle="Acquisition trend over the selected range">
            <Suspense fallback={chartSkeleton}>
              <CustomerGrowthChart data={customerSeries} />
            </Suspense>
          </ChartWrapper>

          <ChartWrapper title="Orders Analytics" subtitle="Grouped order status comparison">
            <Suspense fallback={chartSkeleton}>
              <OrdersAnalyticsChart data={orderSeries} />
            </Suspense>
          </ChartWrapper>
        </div>

        <div className="space-y-6">
          <RevenueIntelligenceCard
            revenue={revenueSummary.current}
            previous={revenueSummary.previous}
            growth={revenueSummary.growth}
            sparkline={revenueSummary.sparkline}
          />
          <ChartWrapper title="Conversion Funnel" subtitle="Pie + radial conversion mix">
            <Suspense fallback={chartSkeleton}>
              <ConversionMixChart conversion={conversionData} />
            </Suspense>
          </ChartWrapper>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <ChartWrapper
          title="Business Funnel"
          subtitle="Drop-off and conversion across stages"
          rightSlot={<span className="text-xs text-slate-300">Config-driven stages</span>}
        >
          <FunnelChart steps={funnelSteps} />
        </ChartWrapper>

        <GlassPanel className="p-6">
          <h2 className="text-lg font-semibold text-white">Funnel Snapshot</h2>
          <div className="mt-4 space-y-3">
            {funnelSteps.map((step) => (
              <div
                key={step.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/35 px-4 py-3"
              >
                <span className="text-sm text-slate-300">{step.label}</span>
                <span className="text-sm font-semibold text-white">{formatNumber(step.value)}</span>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/35 p-6 shadow-xl backdrop-blur-md">
        <h2 className="mb-4 text-lg font-bold text-white">Campaign Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3">Message</th>
                <th className="px-3 py-3">Sent</th>
                <th className="px-3 py-3">Success Rate</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center text-sm text-slate-400">No campaign data for selected range.</td>
                </tr>
              ) : (
                campaigns.map((c, idx) => (
                  <tr key={idx} className="border-b border-white/10 last:border-b-0">
                    <td className="px-3 py-3 text-sm text-slate-300">{c.message}</td>
                    <td className="px-3 py-3 text-sm font-semibold text-white">{formatNumber(c.messagesSent)}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                        {c.successRate}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/35 p-6 shadow-xl backdrop-blur-md">
        <h2 className="mb-4 text-lg font-bold text-white">Top Customer Engagement</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Messages</th>
                <th className="px-3 py-3">Orders</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {engagement.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-400">No engagement data for selected range.</td>
                </tr>
              ) : (
                engagement.slice(0, 10).map((e) => (
                  <tr key={e.customerId} className="border-b border-white/10 last:border-b-0">
                    <td className="px-3 py-3 text-sm text-slate-300">{e.name} ({e.phone})</td>
                    <td className="px-3 py-3 text-sm font-semibold text-white">{formatNumber(e.messages)}</td>
                    <td className="px-3 py-3 text-sm font-semibold text-white">{formatNumber(e.orders)}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          String(e.status).toLowerCase() === 'existing'
                            ? 'border border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
                            : 'border border-blue-400/20 bg-blue-500/10 text-cyan-100'
                        }`}
                      >
                        {String(e.status).toLowerCase() === 'existing' ? 'Existing' : 'New'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;
