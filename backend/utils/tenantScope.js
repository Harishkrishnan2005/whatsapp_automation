const buildTenantScope = (businessId) => {
  if (!businessId) {
    return {};
  }
  return { businessId };
};

export default buildTenantScope;
