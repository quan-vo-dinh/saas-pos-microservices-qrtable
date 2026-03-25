/** Customer-facing BFF API configuration. */
export const API_CONFIG = {
  DEFAULT_BASE_URL: 'http://localhost:3300/api/v1',
  ENDPOINTS: {
    SESSION_VERIFY: '/customer/session/verify',
    MENU_CATEGORIES: '/customer/menu/categories',
    MENU_ITEMS: '/customer/menu/items',
    ORDER_CREATE: '/customer/orders',
    ORDER_STATUS: '/customer/orders/status',
    PAYMENT_REQUEST: '/customer/payment/request',
  },
} as const;
