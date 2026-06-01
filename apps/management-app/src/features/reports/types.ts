export type ReportGrain = 'day' | 'week' | 'month';

export type ReportRangeQuery = {
  from?: string;
  to?: string;
  grain?: ReportGrain;
  timezone?: string;
  limit?: number;
};

export type ReportRange = { from: string; to: string };

export type PaymentRevenueReport = {
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
};

export type OrderReport = {
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
  billStatusBreakdown: Array<{ status: string; count: number; totalVnd: number }>;
  topItems: Array<{
    menuItemId: string;
    menuItemName: string;
    quantity: number;
    revenueVnd: number;
  }>;
};

export type CatalogTableReport = {
  generatedAt: string;
  summary: {
    totalTables: number;
    availableTables: number;
    occupiedTables: number;
    unavailableTables: number;
    totalMenuItems: number;
    activeMenuItems: number;
    outOfStockItems: number;
  };
  tableStatusBreakdown: Array<{ status: string; count: number }>;
  menuAvailabilityBreakdown: Array<{ status: string; count: number }>;
};

export type PlatformReport = {
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
  tenantStatusBreakdown: Array<{ status: string; count: number }>;
  invoiceStatusBreakdown: Array<{ status: string; count: number; totalVnd: number }>;
  planBreakdown: Array<{
    planCode: string;
    planName: string;
    tenantCount: number;
    activeSubscriptionCount: number;
  }>;
};
