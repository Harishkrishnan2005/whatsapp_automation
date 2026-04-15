const buildTenantScope = (businessId) => {
  if (!businessId) {
    return {};
  }

  const scope = [
    { businessId: { $exists: false } },
    { businessId: null },
  ];

  if (businessId) {
    scope.unshift({ businessId });
  }

  return { $or: scope };
};

export default buildTenantScope;
