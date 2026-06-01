import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SAAS_PLAN_FEATURE } from '@einvoice/shared-constants';
import { TenantDashboardClient } from './tenant-dashboard-client';

const mockRevenue = jest.fn();
const mockOrders = jest.fn();
const mockTables = jest.fn();

jest.mock('./hooks/use-dashboard-entitlements', () => ({
  useDashboardEntitlements: jest.fn(),
}));

jest.mock('./hooks/use-report-query', () => ({
  useTenantRevenueReport: (...args: unknown[]) => mockRevenue(...args),
  useTenantOrderReport: (...args: unknown[]) => mockOrders(...args),
  useTenantTableReport: (...args: unknown[]) => mockTables(...args),
}));

import { useDashboardEntitlements } from './hooks/use-dashboard-entitlements';

const baseEntitlements = {
  currentPlanCode: 'FREE',
  features: [SAAS_PLAN_FEATURE.BASIC_POS],
  hasBasicAnalytics: false,
  hasAdvancedAnalytics: false,
  canUseExtendedRange: false,
  upgradeUrl: '/dashboard/subscription',
};

describe('TenantDashboardClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRevenue.mockReturnValue({ isLoading: false, isError: false, data: undefined, refetch: jest.fn() });
    mockOrders.mockReturnValue({ isLoading: false, isError: false, data: undefined, refetch: jest.fn() });
    mockTables.mockReturnValue({ isLoading: false, isError: false, data: undefined, refetch: jest.fn() });
  });

  it('shows locked analytics for FREE tenant without calling report APIs', () => {
    (useDashboardEntitlements as jest.Mock).mockReturnValue({
      entitlements: baseEntitlements,
      subscription: { current: { planCode: 'FREE', status: 'ACTIVE', expiresAt: null, features: [] } },
      isLoading: false,
    });

    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <TenantDashboardClient />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Gói & hạn mức')).toBeTruthy();
    expect(screen.getAllByText('Báo cáo cơ bản').length).toBeGreaterThan(0);
    expect(mockRevenue).toHaveBeenCalledWith(expect.anything(), { enabled: false });
    expect(mockOrders).toHaveBeenCalledWith(expect.anything(), { enabled: false });
    expect(mockTables).toHaveBeenCalledWith({ enabled: false });
  });

  it('renders KPI cards when basic analytics is enabled', () => {
    (useDashboardEntitlements as jest.Mock).mockReturnValue({
      entitlements: {
        ...baseEntitlements,
        currentPlanCode: 'BASIC',
        hasBasicAnalytics: true,
        features: [SAAS_PLAN_FEATURE.ANALYTICS_BASIC],
      },
      subscription: { current: { planCode: 'BASIC', status: 'ACTIVE', expiresAt: null } },
      isLoading: false,
    });

    mockRevenue.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        summary: { grossSalesVnd: 0, collectedVnd: 0, roundingDeltaVnd: 0, paidPaymentCount: 0, averagePaidPaymentVnd: 0 },
        revenueSeries: [],
        paymentMethodBreakdown: [],
      },
      refetch: jest.fn(),
    });

    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <TenantDashboardClient />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Doanh thu bán hàng')).toBeTruthy();
    expect(mockRevenue).toHaveBeenCalledWith(expect.anything(), { enabled: true });
  });
});
