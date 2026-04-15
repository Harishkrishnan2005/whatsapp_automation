import api from '../utils/api';

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.customers)) return payload.customers;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.campaigns)) return payload.campaigns;
  return [];
};

const match = (value, query) =>
  String(value || '')
    .toLowerCase()
    .includes(query.toLowerCase());

const customerService = {
  getCustomers: async () => {
    const response = await api.get('/customers?page=1&limit=200');
    return normalizeList(response.data);
  },
  getOrders: async () => {
    const response = await api.get('/orders?page=1&limit=200');
    return normalizeList(response.data);
  },
  getCampaigns: async () => {
    const response = await api.get('/campaigns?page=1&limit=200');
    return normalizeList(response.data);
  },
  globalSearch: async (rawQuery) => {
    const query = String(rawQuery || '').trim();
    if (!query) {
      return { customers: [], orders: [], campaigns: [] };
    }

    const [customers, orders, campaigns] = await Promise.allSettled([
      customerService.getCustomers(),
      customerService.getOrders(),
      customerService.getCampaigns(),
    ]);

    const customerItems = customers.status === 'fulfilled' ? customers.value : [];
    const orderItems = orders.status === 'fulfilled' ? orders.value : [];
    const campaignItems = campaigns.status === 'fulfilled' ? campaigns.value : [];

    return {
      customers: customerItems
        .filter((item) => match(item?.name, query) || match(item?.phone, query) || match(item?.email, query))
        .slice(0, 5),
      orders: orderItems
        .filter((item) => match(item?.product, query) || match(item?.status, query) || match(item?.customerId?.name, query))
        .slice(0, 5),
      campaigns: campaignItems
        .filter((item) => match(item?.name, query) || match(item?.message, query) || match(item?.status, query))
        .slice(0, 5),
    };
  },
};

export default customerService;
