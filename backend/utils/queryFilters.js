const toDateBoundary = (value, endOfDay = false) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
};

const buildCreatedAtFilter = ({ from, to } = {}) => {
  const fromDate = toDateBoundary(from, false);
  const toDate = toDateBoundary(to, true);

  if (!fromDate && !toDate) return null;

  const createdAt = {};
  if (fromDate) createdAt.$gte = fromDate;
  if (toDate) createdAt.$lte = toDate;
  return createdAt;
};

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildSearchRegex = (search) => {
  const q = String(search || '').trim();
  if (!q) return null;
  return new RegExp(escapeRegex(q), 'i');
};

export { buildCreatedAtFilter, buildSearchRegex };
