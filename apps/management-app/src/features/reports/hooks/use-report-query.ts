'use client';

import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../api';
import type { ReportRangeQuery } from '../types';

export function useTenantRevenueReport(query: ReportRangeQuery) {
  return useQuery({
    queryKey: ['reports', 'tenant', 'revenue', query],
    queryFn: () => reportsApi.getTenantRevenue(query),
  });
}

export function useTenantOrderReport(query: ReportRangeQuery) {
  return useQuery({
    queryKey: ['reports', 'tenant', 'orders', query],
    queryFn: () => reportsApi.getTenantOrders(query),
  });
}

export function useTenantTableReport() {
  return useQuery({
    queryKey: ['reports', 'tenant', 'tables'],
    queryFn: () => reportsApi.getTenantTables(),
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
