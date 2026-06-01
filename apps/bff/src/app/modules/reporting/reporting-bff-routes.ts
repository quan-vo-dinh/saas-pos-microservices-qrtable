export const REPORTING_BFF_ROUTES = {
  dashboardRevenue: '/dashboard/reports/revenue',
  dashboardOrders: '/dashboard/reports/orders',
  dashboardTables: '/dashboard/reports/tables',
  adminPlatform: '/admin/analytics/platform',
  adminTenantRevenue: (tenantId: string) => `/admin/analytics/tenants/${encodeURIComponent(tenantId)}/reports/revenue`,
  adminTenantOrders: (tenantId: string) => `/admin/analytics/tenants/${encodeURIComponent(tenantId)}/reports/orders`,
  adminTenantTables: (tenantId: string) => `/admin/analytics/tenants/${encodeURIComponent(tenantId)}/reports/tables`,
} as const;
