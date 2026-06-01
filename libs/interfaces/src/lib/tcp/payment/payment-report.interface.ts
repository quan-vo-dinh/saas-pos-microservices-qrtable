import type { ReportGrain, ReportRange } from '../common/report.interface';

export interface PaymentRevenueReportRequest {
  tenantId: string;
  timezone: string;
  grain: ReportGrain;
  from: string;
  to: string;
  limit: number;
}

export interface PaymentRevenueReportResponse {
  range: ReportRange;
  timezone: string;
  grain: ReportGrain;
  generatedAt: string;
  summary: {
    grossSalesVnd: number;
    collectedVnd: number;
    roundingDeltaVnd: number;
    paidPaymentCount: number;
    averagePaidPaymentVnd: number;
  };
  revenueSeries: Array<{
    bucket: string;
    label: string;
    grossSalesVnd: number;
    collectedVnd: number;
    paymentCount: number;
  }>;
  paymentMethodBreakdown: Array<{
    method: string;
    grossSalesVnd: number;
    collectedVnd: number;
    paymentCount: number;
  }>;
  recentPayments: Array<{
    paymentId: string;
    billId: string;
    billReference: string;
    method: string;
    status: string;
    grossSalesVnd: number;
    collectedVnd: number;
    paidAt: string;
  }>;
}
