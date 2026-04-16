import { create } from 'zustand';

const DEFAULT_DATE_RANGE = {
  preset: 'last_7_days',
  from: null,
  to: null,
};

const useAnalyticsStore = create((set) => ({
  dateRange: DEFAULT_DATE_RANGE,
  searchQuery: '',
  analyticsData: null,
  refreshToken: 0,
  setDatePreset: (preset) =>
    set((state) => ({
      dateRange:
        preset === 'custom'
          ? { ...state.dateRange, preset: 'custom' }
          : { preset, from: null, to: null },
    })),
  setCustomDateRange: ({ from, to }) =>
    set({
      dateRange: {
        preset: 'custom',
        from: from || null,
        to: to || null,
      },
    }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setAnalyticsData: (analyticsData) => set({ analyticsData }),
  triggerRefresh: () => set((state) => ({ refreshToken: state.refreshToken + 1 })),
}));

export default useAnalyticsStore;
