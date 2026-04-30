/** Customer PWA route paths — single source of truth. */
export const ROUTES = {
  LANDING: '/landing',
  MENU: '/menu',
  ORDER_TRACKING: '/order-tracking',
  ORDER_TRACKING_WITH_ID: '/order-tracking/:orderId',
  ORDER_TRACKING_DETAIL: (orderId: string) => `/order-tracking/${encodeURIComponent(orderId)}`,
  REQUEST_PAYMENT: '/request-payment',
} as const;
