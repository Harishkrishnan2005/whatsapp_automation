import { useCallback, useEffect, useMemo, useState } from 'react';
import analyticsService from '../services/analyticsService';
import useInterval from './useInterval';
import useAnalyticsStore from '../store/analyticsStore';
import { getDateRangePayload } from '../utils/dateRange';

const buildSeries = (analytics) => {
  const base = Number(analytics?.customers?.total || 0);
  return [
    { name: 'W1', customers: Math.max(0, Math.round(base * 0.55)) },
    { name: 'W2', customers: Math.max(0, Math.round(base * 0.68)) },
    { name: 'W3', customers: Math.max(0, Math.round(base * 0.82)) },
    { name: 'W4', customers: Math.max(0, Math.round(base * 0.94)) },
    { name: 'Now', customers: base },
  ];
};

const buildOrderSeries = (analytics) => {
  const pending = Number(analytics?.orders?.pending || 0);
  const confirmed = Number(analytics?.orders?.confirmed || 0);
  const total = Number(analytics?.orders?.total || pending + confirmed);

  return [
    { name: 'Orders', pending, confirmed },
    { name: 'Projection', pending: Math.round(pending * 0.9), confirmed: Math.min(total, Math.round(confirmed * 1.08)) },
  ];
};

const buildFunnel = (analytics) => {
  const totalMessages = Number(analytics?.messages?.total || 0);
  const incoming = Number(analytics?.messages?.incoming || 0);
  const orders = Number(analytics?.orders?.total || 0);
  const confirmed = Number(analytics?.orders?.confirmed || 0);

  return [
    { id: 'messages', label: 'Total Messages', value: totalMessages },
    { id: 'incoming', label: 'Incoming Leads', value: incoming },
    { id: 'orders', label: 'Orders', value: orders },
    { id: 'confirmed', label: 'Confirmed Orders', value: confirmed },
  ];
};

const useAnalyticsData = () => {
  const dateRange = useAnalyticsStore((state) => state.dateRange);
  const refreshToken = useAnalyticsStore((state) => state.refreshToken);
  const setAnalyticsData = useAnalyticsStore((state) => state.setAnalyticsData);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({
    analytics: null,
    campaigns: [],
    engagement: [],
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const payload = getDateRangePayload(dateRange);
      const response = await analyticsService.getDashboardBundle(payload);
      setData(response);
      setAnalyticsData(response);
    } catch (err) {
      setError('Unable to load analytics. Please retry.');
    } finally {
      setLoading(false);
    }
  }, [dateRange, setAnalyticsData]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshToken]);

  useInterval(
    () => {
      fetchData();
    },
    30000,
    true
  );

  const derived = useMemo(() => {
    const analytics = data.analytics || {};

    return {
      customerSeries: buildSeries(analytics),
      orderSeries: buildOrderSeries(analytics),
      funnelSteps: buildFunnel(analytics),
    };
  }, [data.analytics]);

  return {
    ...data,
    ...derived,
    loading,
    error,
    refetch: fetchData,
  };
};

export default useAnalyticsData;
