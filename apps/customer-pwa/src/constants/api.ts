/** Customer-facing BFF API configuration. */
export const API_CONFIG = {
  DEFAULT_BASE_URL: import.meta.env.VITE_BFF_URL ?? 'http://localhost:3000/api/v1',
  ENDPOINTS: {
    MENU: '/menu',
    VALIDATE_QR: '/menu/validate-qr',
    ORDER_CREATE: '/customer/orders',
    ORDER_STATUS: '/customer/orders/status',
    PAYMENT_REQUEST: '/customer/payment/request',
  },
} as const;
