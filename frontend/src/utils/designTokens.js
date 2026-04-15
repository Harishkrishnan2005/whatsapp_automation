export const DESIGN_TOKENS = {
  colors: {
    primary: '#22d3ee',
    secondary: '#3b82f6',
    success: '#34d399',
    danger: '#fb7185',
    warning: '#fbbf24',
    surface: 'rgba(2, 6, 23, 0.5)',
    surfaceBorder: 'rgba(148, 163, 184, 0.18)',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  typography: {
    heading: 'text-xl md:text-2xl font-bold',
    subheading: 'text-sm md:text-base text-slate-300',
    label: 'text-xs font-semibold uppercase tracking-wide',
  },
};

export const DATE_RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom' },
];
