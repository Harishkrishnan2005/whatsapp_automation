const toDateOnly = (date) => date.toISOString().slice(0, 10);

export const getDateRangePayload = (dateRange) => {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  switch (dateRange?.preset) {
    case 'today': {
      return { from: toDateOnly(start), to: toDateOnly(end) };
    }
    case 'yesterday': {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      return { from: toDateOnly(start), to: toDateOnly(end) };
    }
    case 'last_30_days': {
      start.setDate(start.getDate() - 29);
      return { from: toDateOnly(start), to: toDateOnly(end) };
    }
    case 'custom': {
      return {
        from: dateRange?.from || null,
        to: dateRange?.to || null,
      };
    }
    case 'last_7_days':
    default: {
      start.setDate(start.getDate() - 6);
      return { from: toDateOnly(start), to: toDateOnly(end) };
    }
  }
};
