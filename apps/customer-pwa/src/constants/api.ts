/** Customer-facing BFF API configuration. */
export const API_CONFIG = {
  DEFAULT_BASE_URL: import.meta.env.VITE_BFF_URL ?? 'http://localhost:3300/api/v1',
  TENANT_ID: import.meta.env.VITE_TENANT_ID ?? 'tenant_a',
  ENDPOINTS: {
    MENU: '/menu',
    VALIDATE_QR: '/menu/validate-qr',
    ORDER_CREATE: '/customer/orders',
    ORDER_STATUS: '/customer/orders/status',
    PAYMENT_REQUEST: '/customer/payment/request',
  },
} as const;
