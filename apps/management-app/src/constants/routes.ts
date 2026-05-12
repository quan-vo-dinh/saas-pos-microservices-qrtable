/** Management app route paths — single source of truth. */
export const ROUTES = {
  // Auth
  LOGIN: '/login',
  AUTH_CALLBACK: '/auth/callback',

  // Dashboard
  DASHBOARD: '/dashboard',
  MENU: '/dashboard/menu',
  TABLES: '/dashboard/tables',
  ORDERS: '/dashboard/orders',
  STAFF: '/dashboard/staff',
  SUBSCRIPTION: '/dashboard/subscription',
  DASHBOARD_BILLING_INVOICE: (id: string) => `/dashboard/billing/${encodeURIComponent(id)}`,
  DASHBOARD_PAYMENT_SETTINGS: '/dashboard/payment-settings',
  DASHBOARD_SEPAY_CALLBACK: '/dashboard/payment-settings/sepay-callback',

  // POS
  POS: '/pos',
  POS_TABLES: '/pos/tables',
  POS_SERVICE_REQUESTS: '/pos/service-requests',
  POS_BILLS: '/pos/bills',
  /** Legacy alias route; the page redirects to POS_BILLS. */
  POS_PAYMENT: '/pos/payment',

  // KDS
  KDS_KITCHEN: '/kds/kitchen',
  KDS_BAR: '/kds/bar',

  // Admin (Super Admin)
  ADMIN: '/admin',
  ADMIN_TENANTS: '/admin/tenants',
  ADMIN_TENANT_DETAIL: (id: string) => `/admin/tenants/${encodeURIComponent(id)}`,
  ADMIN_PLANS: '/admin/plans',
  ADMIN_BILLING: '/admin/billing',
  ADMIN_ANALYTICS: '/admin/analytics',

  // API
  API_AUTH: '/api/auth',
  API_INTERNAL_ME: '/api/internal/me',
} as const;

/** Route prefixes that require authentication. */
export const PROTECTED_PREFIXES = [ROUTES.DASHBOARD, ROUTES.POS, '/kds', ROUTES.ADMIN] as const;

/** Auth-related paths (redirect logged-in users away). */
export const AUTH_PATHS = [ROUTES.LOGIN] as const;
