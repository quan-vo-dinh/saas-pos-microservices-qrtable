'use client';

import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../api';
import type { ReportRangeQuery } from '../types';

type ReportQueryOptions = {
  enabled?: boolean;
};

export function useTenantRevenueReport(query: ReportRangeQuery, options?: ReportQueryOptions) {
  return useQuery({
    queryKey: ['reports', 'tenant', 'revenue', query],
    queryFn: () => reportsApi.getTenantRevenue(query),
    enabled: options?.enabled ?? true,
  });
}

export function useTenantOrderReport(query: ReportRangeQuery, options?: ReportQueryOptions) {
  return useQuery({
    queryKey: ['reports', 'tenant', 'orders', query],
    queryFn: () => reportsApi.getTenantOrders(query),
    enabled: options?.enabled ?? true,
  });
}

export function useTenantTableReport(options?: ReportQueryOptions) {
  return useQuery({
    queryKey: ['reports', 'tenant', 'tables'],
    queryFn: () => reportsApi.getTenantTables(),
    enabled: options?.enabled ?? true,
  });
}

export function usePlatformAnalyticsReport(query: ReportRangeQuery) {
  return useQuery({
    queryKey: ['reports', 'platform', query],
    queryFn: () => reportsApi.getPlatformAnalytics(query),
  });
}

export function useAdminTenantRevenueReport(tenantId: string | undefined, query: ReportRangeQuery) {
  return useQuery({
    queryKey: ['reports', 'admin', tenantId, 'revenue', query],
    queryFn: () => reportsApi.getAdminTenantRevenue(tenantId!, query),
    enabled: Boolean(tenantId),
  });
}

export function useAdminTenantOrderReport(tenantId: string | undefined, query: ReportRangeQuery) {
  return useQuery({
    queryKey: ['reports', 'admin', tenantId, 'orders', query],
    queryFn: () => reportsApi.getAdminTenantOrders(tenantId!, query),
    enabled: Boolean(tenantId),
  });
}

export function useAdminTenantTableReport(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['reports', 'admin', tenantId, 'tables'],
    queryFn: () => reportsApi.getAdminTenantTables(tenantId!),
    enabled: Boolean(tenantId),
  });
}
