import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TenantDashboardClient } from './tenant-dashboard-client';

jest.mock('./hooks/use-report-query', () => ({
  useTenantRevenueReport: () => ({ isLoading: false, isError: false, data: {
    summary: { grossSalesVnd: 0, collectedVnd: 0, roundingDeltaVnd: 0, paidPaymentCount: 0, averagePaidPaymentVnd: 0 },
    revenueSeries: [],
    paymentMethodBreakdown: [],
  }, refetch: jest.fn() }),
  useTenantOrderReport: () => ({ isLoading: false, isError: false, data: {
    summary: { orderCount: 0, completedOrderCount: 0, cancelledOrderCount: 0, paidBillCount: 0, pendingBillCount: 0, averagePaidBillVnd: 0 },
    billStatusBreakdown: [],
    topItems: [],
  }, refetch: jest.fn() }),
  useTenantTableReport: () => ({ isLoading: false, isError: false, data: {
    summary: { totalTables: 0, availableTables: 0, occupiedTables: 0, unavailableTables: 0, totalMenuItems: 0, activeMenuItems: 0, outOfStockItems: 0 },
    tableStatusBreakdown: [],
    menuAvailabilityBreakdown: [],
  }, refetch: jest.fn() }),
}));

describe('TenantDashboardClient', () => {
  it('renders populated dashboard metrics at zero', () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <TenantDashboardClient />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Doanh thu bán hàng')).toBeTruthy();
    expect(screen.getByText('Đã thu')).toBeTruthy();
  });
});
