import type { ReportGrain, ReportRange } from '../common/report.interface';

export interface PlatformReportRequest {
  timezone: string;
  grain: ReportGrain;
  from: string;
  to: string;
  limit: number;
}

export interface PlatformReportResponse {
  range: ReportRange;
  timezone: string;
  grain: ReportGrain;
  generatedAt: string;
  summary: {
    platformRevenueVnd: number;
    paidInvoiceCount: number;
    pendingInvoiceCount: number;
    activeTenantCount: number;
    suspendedTenantCount: number;
    closedTenantCount: number;
  };
  revenueSeries: Array<{
    bucket: string;
    label: string;
    platformRevenueVnd: number;
    paidInvoiceCount: number;
  }>;
  tenantStatusBreakdown: Array<{
    status: string;
    count: number;
  }>;
  invoiceStatusBreakdown: Array<{
    status: string;
    count: number;
    totalVnd: number;
  }>;
  planBreakdown: Array<{
    planCode: string;
    planName: string;
    tenantCount: number;
    activeSubscriptionCount: number;
  }>;
}
