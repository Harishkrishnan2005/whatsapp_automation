export const FEATURES = {
  CHAT: 'CHAT',
  ORDERS: 'ORDERS',
  SUPPORT: 'SUPPORT',
  CAMPAIGN: 'CAMPAIGN',
  CUSTOMERS: 'CUSTOMERS',
};

export const PLAN_FEATURES = {
  FREE: [],
  BASIC: [FEATURES.CHAT, FEATURES.ORDERS, FEATURES.SUPPORT],
  PRO: [FEATURES.CHAT, FEATURES.ORDERS, FEATURES.SUPPORT, FEATURES.CAMPAIGN],
  ENTERPRISE: Object.values(FEATURES),
};

export const STAFF_ROLE_FEATURES = {
  SUPPORT: [FEATURES.CHAT, FEATURES.SUPPORT],
  SALES: [FEATURES.ORDERS, FEATURES.CUSTOMERS],
  MARKETING: [FEATURES.CAMPAIGN],
  MANAGER: Object.values(FEATURES),
};

const normalize = (value) => String(value || '').trim().toUpperCase();

const getPlanFeatures = (plan) => PLAN_FEATURES[normalize(plan)] || [];

const getRoleFeatures = (user) => {
  const role = normalize(user?.role);

  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    return Object.values(FEATURES);
  }

  if (role !== 'STAFF') {
    return [];
  }

  return STAFF_ROLE_FEATURES[normalize(user?.staffRole)] || [];
};

export const isFeatureInPlan = (user, feature) => {
  if (!feature) return true;

  const normalizedFeature = normalize(feature);
  const planFeatures = getPlanFeatures(user?.plan || 'FREE');

  if (normalizedFeature === FEATURES.CUSTOMERS) {
    return planFeatures.includes(FEATURES.ORDERS);
  }

  return planFeatures.includes(normalizedFeature);
};

export const isFeatureAllowedForRole = (user, feature) => {
  if (!feature) return true;

  const normalizedFeature = normalize(feature);
  const roleFeatures = getRoleFeatures(user);

  if (normalizedFeature === FEATURES.CUSTOMERS) {
    return roleFeatures.includes(FEATURES.CUSTOMERS) || roleFeatures.includes(FEATURES.ORDERS);
  }

  return roleFeatures.includes(normalizedFeature);
};

export const canAccess = (user, feature) => {
  const inPlan = isFeatureInPlan(user, feature);
  const allowedByRole = isFeatureAllowedForRole(user, feature);

  return inPlan && allowedByRole;
};

export const getFeatureAccessState = (user, feature) => {
  const inPlan = isFeatureInPlan(user, feature);
  const allowedByRole = isFeatureAllowedForRole(user, feature);

  return {
    inPlan,
    allowedByRole,
    canAccess: inPlan && allowedByRole,
    shouldHide: !inPlan,
    shouldDisable: inPlan && !allowedByRole,
  };
};
