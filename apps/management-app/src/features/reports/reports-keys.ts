import type { ReportRangeQuery } from './types';

export const reportsKeys = {
  all: ['reports'] as const,
  tenant: () => [...reportsKeys.all, 'tenant'] as const,
  tenantRevenue: (query: ReportRangeQuery) => [...reportsKeys.tenant(), 'revenue', query] as const,
  tenantOrders: (query: ReportRangeQuery) => [...reportsKeys.tenant(), 'orders', query] as const,
  tenantTables: () => [...reportsKeys.tenant(), 'tables'] as const,
  platform: (query: ReportRangeQuery) => [...reportsKeys.all, 'platform', query] as const,
  admin: () => [...reportsKeys.all, 'admin'] as const,
  adminTenantOptions: () => [...reportsKeys.admin(), 'tenant-options'] as const,
  adminTenantRevenue: (tenantId: string | undefined, query: ReportRangeQuery) =>
    [...reportsKeys.admin(), 'tenant', tenantId ?? '', 'revenue', query] as const,
  adminTenantOrders: (tenantId: string | undefined, query: ReportRangeQuery) =>
    [...reportsKeys.admin(), 'tenant', tenantId ?? '', 'orders', query] as const,
  adminTenantTables: (tenantId: string | undefined) =>
    [...reportsKeys.admin(), 'tenant', tenantId ?? '', 'tables'] as const,
};
