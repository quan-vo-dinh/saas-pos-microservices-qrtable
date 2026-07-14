export const cartKeys = {
  all: ['customer-cart'] as const,
  snapshot: (tenantId: string, sessionId: string) => [...cartKeys.all, tenantId, sessionId] as const,
};

export const orderKeys = {
  all: ['customer-orders'] as const,
  list: (tenantId: string, sessionId: string) => [...orderKeys.all, 'list', tenantId, sessionId] as const,
  detail: (tenantId: string, sessionId: string, orderId: string) =>
    [...orderKeys.all, 'detail', tenantId, sessionId, orderId] as const,
};

export const billKeys = {
  all: ['customer-bill'] as const,
  current: (tenantId: string, sessionId: string) => [...billKeys.all, 'current', tenantId, sessionId] as const,
};
