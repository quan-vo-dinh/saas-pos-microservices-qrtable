/** Environment-aware BFF API configuration. */
export const API_CONFIG = {
  DEFAULT_BFF_URL: process.env.NEXT_PUBLIC_BFF_URL ?? 'http://localhost:3300/api/v1',
  /** Customer PWA origin for QR links (no trailing path). */
  CUSTOMER_PWA_ORIGIN: process.env.NEXT_PUBLIC_CUSTOMER_PWA_URL ?? 'http://localhost:5173',
  ENDPOINTS: {
    AUTHORIZER_ME: '/authorizer/me',
    CATEGORIES: '/admin/categories',
    CATEGORIES_REORDER: '/admin/categories/reorder',
    MENU_ITEMS: '/admin/menu-items',
    AREAS: '/admin/areas',
    AREAS_REORDER: '/admin/areas/reorder',
    TABLES: '/admin/tables',
    ADMIN_ORDERS: '/admin/orders',
    ADMIN_SERVICE_REQUESTS: '/admin/service-requests',
    ADMIN_TABLES_TRANSFER: '/admin/tables/transfer',
    ADMIN_TABLES_RELEASE_EMPTY_SESSION: (tableId: string) =>
      `/admin/tables/${encodeURIComponent(tableId)}/release-empty-session`,
    ADMIN_BILLS: '/admin/bills',
    ADMIN_BILLS_REOPEN: '/admin/bills',
    ADMIN_CURRENT_TENANT: '/admin/tenant/current',
    /** Step 2.6 KDS — BFF `KitchenController` */
    KDS_QUEUE: '/admin/kds/queue',
    KDS_TICKET_START: (ticketId: string) => `/admin/kds/tickets/${encodeURIComponent(ticketId)}/start`,
    KDS_TICKET_DONE: (ticketId: string) => `/admin/kds/tickets/${encodeURIComponent(ticketId)}/done`,
    KDS_TICKET_RECALL: (ticketId: string) => `/admin/kds/tickets/${encodeURIComponent(ticketId)}/recall`,
    KDS_TICKET_PRIORITY: (ticketId: string) => `/admin/kds/tickets/${encodeURIComponent(ticketId)}/priority`,
    PAYMENT_CREATE_VIETQR: '/payment/vietqr/create-qr',
    PAYMENT_CONFIRM_CASH: '/payment/cash/confirm',
    PAYMENT_REFUND_REQUEST: '/payment/refund/request',
    PAYMENT_REFUND_CONFIRM: '/payment/refund/confirm',
    PAYMENT_HISTORY: '/payment/history',
  },
} as const;

/** Token refresh buffer (ms) — refresh 60s before expiry. */
export const TOKEN_REFRESH_BUFFER_MS = 60_000;
