import { authApiClient } from '@/lib/api/authenticated-client';
import type { CatalogTableReport, OrderReport, PaymentRevenueReport, PlatformReport, ReportRangeQuery } from '../types';

function toSearchParams(query: ReportRangeQuery): string {
  const params = new URLSearchParams();
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.grain) params.set('grain', query.grain);
  if (query.timezone) params.set('timezone', query.timezone);
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  const s = params.toString();
  return s ? `?${s}` : '';
}

function unwrap<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>)) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

export const reportsService = {
  getTenantRevenue: async (query: ReportRangeQuery) =>
    unwrap<PaymentRevenueReport>(await authApiClient(`/dashboard/reports/revenue${toSearchParams(query)}`)),

  getTenantOrders: async (query: ReportRangeQuery) =>
    unwrap<OrderReport>(await authApiClient(`/dashboard/reports/orders${toSearchParams(query)}`)),

  getTenantTables: async () => unwrap<CatalogTableReport>(await authApiClient('/dashboard/reports/tables')),

  getPlatformAnalytics: async (query: ReportRangeQuery) =>
    unwrap<PlatformReport>(await authApiClient(`/admin/analytics/platform${toSearchParams(query)}`)),

  getAdminTenantRevenue: async (tenantId: string, query: ReportRangeQuery) =>
    unwrap<PaymentRevenueReport>(
      await authApiClient(
        `/admin/analytics/tenants/${encodeURIComponent(tenantId)}/reports/revenue${toSearchParams(query)}`,
      ),
    ),

  getAdminTenantOrders: async (tenantId: string, query: ReportRangeQuery) =>
    unwrap<OrderReport>(
      await authApiClient(
        `/admin/analytics/tenants/${encodeURIComponent(tenantId)}/reports/orders${toSearchParams(query)}`,
      ),
    ),

  getAdminTenantTables: async (tenantId: string) =>
    unwrap<CatalogTableReport>(
      await authApiClient(`/admin/analytics/tenants/${encodeURIComponent(tenantId)}/reports/tables`),
    ),
};
