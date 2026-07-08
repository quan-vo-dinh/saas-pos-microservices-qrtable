'use client';

import { useQuery } from '@tanstack/react-query';
import { reportsKeys } from '../reports-keys';
import { reportsService } from '../services/reports.service';
import type { ReportRangeQuery } from '../types';

type ReportQueryOptions = {
  enabled?: boolean;
};

export function useTenantRevenueReport(query: ReportRangeQuery, options?: ReportQueryOptions) {
  return useQuery({
    queryKey: reportsKeys.tenantRevenue(query),
    queryFn: () => reportsService.getTenantRevenue(query),
    enabled: options?.enabled ?? true,
  });
}

export function useTenantOrderReport(query: ReportRangeQuery, options?: ReportQueryOptions) {
  return useQuery({
    queryKey: reportsKeys.tenantOrders(query),
    queryFn: () => reportsService.getTenantOrders(query),
    enabled: options?.enabled ?? true,
  });
}

export function useTenantTableReport(options?: ReportQueryOptions) {
  return useQuery({
    queryKey: reportsKeys.tenantTables(),
    queryFn: () => reportsService.getTenantTables(),
    enabled: options?.enabled ?? true,
  });
}

export function usePlatformAnalyticsReport(query: ReportRangeQuery) {
  return useQuery({
    queryKey: reportsKeys.platform(query),
    queryFn: () => reportsService.getPlatformAnalytics(query),
  });
}

export function useAdminTenantRevenueReport(tenantId: string | undefined, query: ReportRangeQuery) {
  return useQuery({
    queryKey: reportsKeys.adminTenantRevenue(tenantId, query),
    queryFn: () => reportsService.getAdminTenantRevenue(tenantId!, query),
    enabled: Boolean(tenantId),
  });
}

export function useAdminTenantOrderReport(tenantId: string | undefined, query: ReportRangeQuery) {
  return useQuery({
    queryKey: reportsKeys.adminTenantOrders(tenantId, query),
    queryFn: () => reportsService.getAdminTenantOrders(tenantId!, query),
    enabled: Boolean(tenantId),
  });
}

export function useAdminTenantTableReport(tenantId: string | undefined) {
  return useQuery({
    queryKey: reportsKeys.adminTenantTables(tenantId),
    queryFn: () => reportsService.getAdminTenantTables(tenantId!),
    enabled: Boolean(tenantId),
  });
}
