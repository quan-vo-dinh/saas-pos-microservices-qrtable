/** Environment-aware BFF API configuration. */
export const API_CONFIG = {
  DEFAULT_BFF_URL: process.env.NEXT_PUBLIC_BFF_URL ?? 'http://localhost:3300/api/v1',
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
    ADMIN_BILLS_REOPEN: '/admin/bills',
  },
} as const;

/** Token refresh buffer (ms) — refresh 60s before expiry. */
export const TOKEN_REFRESH_BUFFER_MS = 60_000;
