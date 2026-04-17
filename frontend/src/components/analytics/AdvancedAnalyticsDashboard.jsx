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
      { name: 'Confirmed', value: Number(analytics.orders?.confirmed || 0), color: '#2563eb' },
      { name: 'Pending', value: Number(analytics.orders?.pending || 0), color: '#64748b' },
      { name: 'Failed', value: Number(analytics.orders?.failed || 0), color: '#94a3b8' },
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
      <div className="space-y-10 animate-fade-in p-8">
        <div className="h-40 bg-slate-100 rounded-3xl animate-pulse" />
        <div className="grid grid-cols-4 gap-6">
           {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in pb-12 px-4 md:px-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Intelligence Hub</h1>
          <p className="mt-2 text-slate-500 font-medium">Monitoring enterprise behavior, campaign yield, and operational throughput.</p>
        </div>
        <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
           <div className="flex -space-x-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 border-2 border-white" />
              <div className="h-8 w-8 rounded-full bg-blue-200 border-2 border-white" />
              <div className="h-8 w-8 rounded-full bg-blue-300 border-2 border-white" />
           </div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Real-time Data Active</p>
        </div>
      </header>

      {error && <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-xs font-bold text-rose-700">{error}</div>}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.id} className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm group hover:border-blue-500/20 transition-all duration-300">
             <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</span>
                <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${kpi.trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                   {kpi.trend > 0 ? '+' : ''}{kpi.trend}%
                </span>
             </div>
             <p className="text-3xl font-black text-slate-900 tracking-tighter">{formatNumber(kpi.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-8">
          <ChartWrapper title="Customer Acquisition Trend" subtitle="Temporal progression of new identifiers">
             <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
               <Suspense fallback={chartSkeleton}>
                 <CustomerGrowthChart data={customerSeries} />
               </Suspense>
             </div>
          </ChartWrapper>

          <ChartWrapper title="Operational Load" subtitle="Status-based distribution of system orders">
             <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
               <Suspense fallback={chartSkeleton}>
                 <OrdersAnalyticsChart data={orderSeries} />
               </Suspense>
             </div>
          </ChartWrapper>
        </div>

        <div className="space-y-8">
          <RevenueIntelligenceCard
            revenue={revenueSummary.current}
            previous={revenueSummary.previous}
            growth={revenueSummary.growth}
            sparkline={revenueSummary.sparkline}
          />
          <ChartWrapper title="Yield Distribution" subtitle="System-wide conversion metrics">
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200/60 shadow-sm">
               <Suspense fallback={chartSkeleton}>
                 <ConversionMixChart conversion={conversionData} />
               </Suspense>
            </div>
          </ChartWrapper>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <ChartWrapper title="Enterprise Funnel" subtitle="Drop-off analysis across protocol layers">
           <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200/60 shadow-sm">
             <FunnelChart steps={funnelSteps} />
           </div>
        </ChartWrapper>

        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200/60 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
             Funnel Summary
             <span className="h-2 w-2 rounded-full bg-blue-600 block" />
          </h2>
          <div className="space-y-3">
            {funnelSteps.map((step) => (
              <div
                key={step.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 px-6 py-4"
              >
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{step.label}</span>
                <span className="text-sm font-black text-slate-900">{formatNumber(step.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
        <div className="px-8 py-6 border-b border-slate-100">
           <h2 className="text-lg font-black text-slate-900">Campaign Logistics View</h2>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Audit of out-bound communications</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Message Payload</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Transmission Sent</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Success Velocity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-8 py-16 text-center opacity-30 italic">No communication logs detected.</td>
                </tr>
              ) : (
                campaigns.map((c, idx) => (
                  <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-6 text-sm font-medium text-slate-600">{c.message}</td>
                    <td className="px-8 py-6 text-sm font-black text-slate-900">{formatNumber(c.messagesSent)}</td>
                    <td className="px-8 py-6 text-right">
                       <span className="inline-flex px-3 py-1 rounded-lg bg-blue-50 border border-blue-100 text-[9px] font-black text-blue-600 uppercase tracking-widest">
                         {c.successRate}% YIELD
                       </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b border-slate-100">
             <h2 className="text-lg font-black text-slate-900">User Engagement Matrix</h2>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">High-frequency customer interactions</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/30">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Operative Identifier</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Exchange Volume</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Protocol Hits</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Status State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {engagement.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-16 text-center opacity-30 italic">Operational silence.</td>
                  </tr>
                ) : (
                  engagement.slice(0, 10).map((e) => (
                    <tr key={e.customerId} className="group hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-4">
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black text-[10px]">
                               {e.name ? e.name[0].toUpperCase() : '?'}
                            </div>
                            <div>
                               <p className="text-sm font-bold text-slate-800">{e.name}</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{e.phone}</p>
                            </div>
                         </div>
                      </td>
                      <td className="px-8 py-6 text-sm font-black text-slate-900">{formatNumber(e.messages)} MSG</td>
                      <td className="px-8 py-6 text-sm font-black text-slate-900">{formatNumber(e.orders)} HIT</td>
                      <td className="px-8 py-6 text-right">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                          String(e.status).toLowerCase() === 'existing'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-blue-50 text-blue-600'
                        }`}>
                          {e.status}
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

