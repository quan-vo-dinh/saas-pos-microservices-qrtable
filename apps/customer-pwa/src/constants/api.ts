/** Customer-facing BFF API configuration. */
export const API_CONFIG = {
  DEFAULT_BASE_URL: import.meta.env.VITE_BFF_URL ?? 'http://localhost:3300/api/v1',
  TENANT_ID: import.meta.env.VITE_TENANT_ID ?? 'tenant_a',
  ENDPOINTS: {
    MENU: '/menu',
    VALIDATE_QR: '/menu/validate-qr',
    SESSION_JOIN: '/customer/sessions/join',
    PUBLIC_TENANT: (slug: string) => `/public/tenants/${encodeURIComponent(slug)}`,
    CART: '/customer/cart',
    ORDERS: '/customer/orders',
    ORDER_BY_ID: (id: string) => `/customer/orders/${encodeURIComponent(id)}`,
    SERVICE_REQUESTS: '/customer/service-requests',
    BILL_REQUEST: '/customer/bill/request',
    BILL_CURRENT: '/customer/bill/current',
  },
} as const;

/** Persisted Order session (after successful POST /customer/sessions/join). */
export const PWA_SESSION_STORAGE_KEY = 'qrtable:pwa:order-session';
