export const STAFF_ROLES = ['SUPPORT', 'SALES', 'MARKETING', 'MANAGER'];

export const ACCESS_AREAS = {
  CHAT: 'chat',
  TICKETS: 'tickets',
  ORDERS: 'orders',
  CAMPAIGNS: 'campaigns',
  FEEDBACK: 'feedback',
  BILLING: 'billing',
};

export const STAFF_ROLE_ACCESS = {
  SUPPORT: [ACCESS_AREAS.CHAT, ACCESS_AREAS.TICKETS, ACCESS_AREAS.FEEDBACK],
  SALES: [ACCESS_AREAS.CHAT, ACCESS_AREAS.ORDERS, ACCESS_AREAS.FEEDBACK],
  MARKETING: [ACCESS_AREAS.CAMPAIGNS, ACCESS_AREAS.FEEDBACK],
  MANAGER: [
    ACCESS_AREAS.CHAT,
    ACCESS_AREAS.TICKETS,
    ACCESS_AREAS.ORDERS,
    ACCESS_AREAS.CAMPAIGNS,
    ACCESS_AREAS.FEEDBACK,
  ],
};

export const normalizeStaffRole = (role) => {
  const normalized = String(role || '').trim().toUpperCase();
  return STAFF_ROLES.includes(normalized) ? normalized : null;
};

export const hasAreaAccess = (user, area) => {
  if (!user) return false;
  if (user.role === 'super_admin' || user.role === 'admin') return true;
  if (user.role !== 'staff') return false;

  const staffRole = normalizeStaffRole(user.staffRole);
  if (!staffRole) return false;

  return (STAFF_ROLE_ACCESS[staffRole] || []).includes(area);
};
