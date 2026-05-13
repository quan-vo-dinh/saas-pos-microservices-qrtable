import { render, screen } from '@testing-library/react';
import { TenantStatusBanner } from './tenant-status-banner';

const useSessionMock = jest.fn();

jest.mock('@/features/session/context/session-provider', () => ({
  useSession: () => useSessionMock(),
}));

describe('TenantStatusBanner', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('hides banner for active tenant', () => {
    useSessionMock.mockReturnValue({ session: { tenantStatus: 'ACTIVE' } });

    render(<TenantStatusBanner />);

    expect(screen.queryByText('Cửa hàng đang tạm khóa')).toBeNull();
    expect(screen.queryByText('Cửa hàng không còn hoạt động trên QRTable')).toBeNull();
  });

  it('renders suspended tenant banner', () => {
    useSessionMock.mockReturnValue({
      session: { tenantStatus: 'SUSPENDED', tenantStatusReason: 'SUBSCRIPTION_EXPIRED' },
    });

    render(<TenantStatusBanner />);

    expect(screen.getByText('Cửa hàng đang tạm khóa')).toBeTruthy();
    expect(screen.getByText(/Nhà hàng hiện chưa nhận đơn qua QRTable/)).toBeTruthy();
    expect(screen.getByText(/SUBSCRIPTION_EXPIRED/)).toBeTruthy();
  });

  it('renders closed tenant banner', () => {
    useSessionMock.mockReturnValue({ session: { tenantStatus: 'CLOSED', tenantStatusReason: 'CLOSED_BY_ADMIN' } });

    render(<TenantStatusBanner />);

    expect(screen.getByText('Cửa hàng không còn hoạt động trên QRTable')).toBeTruthy();
    expect(screen.getByText(/Vui lòng liên hệ nhân viên tại quầy/)).toBeTruthy();
    expect(screen.getByText(/CLOSED_BY_ADMIN/)).toBeTruthy();
  });
});
