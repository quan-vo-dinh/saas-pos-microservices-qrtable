import { render } from '@testing-library/react';

const mockUseAuthReadyForBff = jest.fn();
const mockUseQuery = jest.fn();
const mockUseQueryClient = jest.fn();
const mockUseSession = jest.fn();
const mockGetDashboardSubscription = jest.fn();
const mockGetDashboardPaymentSettings = jest.fn();

jest.mock('@/lib/auth/use-auth-ready', () => ({
  useAuthReadyForBff: () => mockUseAuthReadyForBff(),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useQueryClient: () => mockUseQueryClient(),
}));

jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

jest.mock('@/features/saas/api', () => ({
  saasApi: {
    checkoutSubscription: jest.fn(),
    getDashboardSubscription: () => mockGetDashboardSubscription(),
    getDashboardPaymentSettings: () => mockGetDashboardPaymentSettings(),
  },
}));

jest.mock('@/features/saas/subscription/checkout-qr-dialog', () => ({
  CheckoutQrDialog: () => <div data-testid="checkout-qr-dialog" />,
}));

jest.mock('@/features/saas/subscription/current-plan-panel', () => ({
  CurrentPlanPanel: () => <div data-testid="current-plan-panel" />,
}));

jest.mock('@/features/saas/subscription/plan-compare-table', () => ({
  PlanCompareTable: () => <div data-testid="plan-compare-table" />,
}));

jest.mock('@/features/saas/payment-settings/sepay-connect-button', () => ({
  SepayConnectButton: () => <button type="button">Connect SePay</button>,
}));

jest.mock('@/features/saas/payment-settings/payment-settings-summary', () => ({
  PaymentSettingsSummary: () => <div data-testid="payment-settings-summary" />,
}));

jest.mock('@/features/saas/payment-settings/disconnect-sepay-dialog', () => ({
  DisconnectSepayDialog: () => <div data-testid="disconnect-sepay-dialog" />,
}));

import DashboardPaymentSettingsPage from '@/app/(dashboard)/dashboard/payment-settings/page';
import DashboardSubscriptionPage from '@/app/(dashboard)/dashboard/subscription/page';

describe('Phase 4B dashboard query auth readiness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryClient.mockReturnValue({ invalidateQueries: jest.fn() });
    mockUseSession.mockReturnValue({ data: { user: { permissions: [] } } });
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it('keeps subscription query disabled until auth is hydrated', () => {
    mockUseAuthReadyForBff.mockReturnValue(false);

    render(<DashboardSubscriptionPage />);

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['dashboard-subscription'],
        enabled: false,
      }),
    );
    expect(mockGetDashboardSubscription).not.toHaveBeenCalled();
  });

  it('keeps payment settings query disabled until auth is hydrated', () => {
    mockUseAuthReadyForBff.mockReturnValue(false);

    render(<DashboardPaymentSettingsPage />);

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['dashboard-payment-settings'],
        enabled: false,
      }),
    );
    expect(mockGetDashboardPaymentSettings).not.toHaveBeenCalled();
  });

  it('enables dashboard queries once auth is ready', () => {
    mockUseAuthReadyForBff.mockReturnValue(true);

    render(<DashboardSubscriptionPage />);
    render(<DashboardPaymentSettingsPage />);

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['dashboard-subscription'],
        enabled: true,
      }),
    );
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['dashboard-payment-settings'],
        enabled: true,
      }),
    );
  });
});
