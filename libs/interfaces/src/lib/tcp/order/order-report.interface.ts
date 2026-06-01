import type { ReportGrain, ReportRange } from '../common/report.interface';

export interface OrderReportRequest {
  tenantId: string;
  timezone: string;
  grain: ReportGrain;
  from: string;
  to: string;
  limit: number;
}

export interface OrderReportResponse {
  range: ReportRange;
  timezone: string;
  grain: ReportGrain;
  generatedAt: string;
  summary: {
    orderCount: number;
    completedOrderCount: number;
    cancelledOrderCount: number;
    paidBillCount: number;
    pendingBillCount: number;
    averagePaidBillVnd: number;
  };
  orderSeries: Array<{
    bucket: string;
    label: string;
    orderCount: number;
    paidBillCount: number;
    completedOrderCount: number;
  }>;
  billStatusBreakdown: Array<{
    status: string;
    count: number;
    totalVnd: number;
  }>;
  topItems: Array<{
    menuItemId: string;
    menuItemName: string;
    quantity: number;
    revenueVnd: number;
  }>;
}
