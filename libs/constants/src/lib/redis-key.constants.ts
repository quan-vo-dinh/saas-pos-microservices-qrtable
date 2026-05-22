export const RedisKey = {
  menu: {
    public: (tenantId: string) => `menu:${tenantId}`,
  },
  session: {
    data: (tenantId: string, sessionId: string) => `session:${tenantId}:${sessionId}`,
  },
  cart: {
    data: (tenantId: string, sessionId: string) => `cart:${tenantId}:${sessionId}`,
  },
  quota: {
    dailyOrders: (tenantId: string, date: string) => `quota:${tenantId}:orders:${date}`,
  },
} as const;
