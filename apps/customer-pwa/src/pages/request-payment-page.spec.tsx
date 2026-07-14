import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { CartSnapshot } from '@einvoice/types';
import { BillStatus, PaymentStatus } from '@einvoice/types';
import { RequestPaymentPage } from './request-payment-page';

const useSessionMock = jest.fn();
const useCurrentBillQueryMock = jest.fn();
const mutateAsyncMock = jest.fn();

jest.mock('@/features/session/context/session-provider', () => ({
  useSession: () => useSessionMock(),
}));

jest.mock('@/features/order/hooks/use-bill-query', () => ({
  useCurrentBillQuery: () => useCurrentBillQueryMock(),
  useRequestBillMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('@/features/payment/hooks/use-create-vietqr-mutation', () => ({
  useCreateVietQrMutation: () => ({ mutateAsync: mutateAsyncMock, isPending: false }),
}));

function makeCart(overrides: Partial<CartSnapshot> = {}): CartSnapshot {
  return {
    tenantId: 'tenant-1',
    sessionId: 'session-1',
    cartVersion: 1,
    status: 'LOCKED',
    updatedAt: '2026-04-30T00:00:00.000Z',
    items: [],
    ...overrides,
  };
}

describe('RequestPaymentPage', () => {
  beforeEach(() => {
    useSessionMock.mockReturnValue({ isActive: true });
    mutateAsyncMock.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders paid success state', () => {
    useCurrentBillQueryMock.mockReturnValue({
      data: {
        bill: {
          id: 'bill-1',
          tenantId: 'tenant-1',
          sessionId: 'session-1',
          orderIds: [],
          subtotal: 128000,
          total: 128000,
          roundingAmount: 0,
          status: BillStatus.PAID,
          createdAt: '2026-05-10T00:00:00.000Z',
          updatedAt: '2026-05-10T00:00:00.000Z',
        },
        cart: makeCart({ status: 'LOCKED' }),
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(
      <MemoryRouter>
        <RequestPaymentPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Thanh toán thành công')).toBeTruthy();
    expect(screen.getByText(/128\.000/)).toBeTruthy();
  });

  it('creates and renders VietQR for pending bill', async () => {
    mutateAsyncMock.mockResolvedValue({
      id: 'pay-1',
      tenantId: 'tenant-1',
      billId: 'bill-1',
      billReference: 'QRTBLB1A2C3D4',
      qrUrl: 'https://qr.sepay.vn/img?acc=1&amount=128000&des=QRTBLB1A2C3D4',
      bankAccount: '0010000000355',
      bankName: 'Vietcombank',
      roundedTotal: 128000,
      rawTotal: 127500,
      roundingDelta: 500,
      status: PaymentStatus.PENDING,
      createdAt: '2026-05-10T00:00:00.000Z',
      updatedAt: '2026-05-10T00:00:00.000Z',
    });

    useCurrentBillQueryMock.mockReturnValue({
      data: {
        bill: {
          id: 'bill-1',
          tenantId: 'tenant-1',
          sessionId: 'session-1',
          orderIds: [],
          subtotal: 128000,
          total: 128000,
          roundingAmount: 0,
          status: BillStatus.PENDING_PAYMENT,
          createdAt: '2026-05-10T00:00:00.000Z',
          updatedAt: '2026-05-10T00:00:00.000Z',
        },
        cart: makeCart({ status: 'LOCKED' }),
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(
      <MemoryRouter>
        <RequestPaymentPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Thanh toán bằng VietQR/i }));

    await waitFor(() => {
      expect(screen.getByText(/QRTBLB1A2C3D4/)).toBeTruthy();
    });
    expect(screen.getByText('0010000000355')).toBeTruthy();
    expect(screen.getByAltText('VietQR').getAttribute('src')).toContain('qr.sepay.vn');
  });

  it('keeps VietQR payment available for suspended tenant with a pending bill', async () => {
    useSessionMock.mockReturnValue({
      isActive: true,
      session: { tenantStatus: 'SUSPENDED', tenantStatusReason: 'SUBSCRIPTION_EXPIRED' },
    });
    mutateAsyncMock.mockResolvedValue({
      id: 'pay-1',
      tenantId: 'tenant-1',
      billId: 'bill-1',
      billReference: 'QRTBLB1A2C3D4',
      qrUrl: 'https://qr.sepay.vn/img?acc=1&amount=128000&des=QRTBLB1A2C3D4',
      bankAccount: '0010000000355',
      bankName: 'Vietcombank',
      roundedTotal: 128000,
      rawTotal: 127500,
      roundingDelta: 500,
      status: PaymentStatus.PENDING,
      createdAt: '2026-05-10T00:00:00.000Z',
      updatedAt: '2026-05-10T00:00:00.000Z',
    });
    useCurrentBillQueryMock.mockReturnValue({
      data: {
        bill: {
          id: 'bill-1',
          tenantId: 'tenant-1',
          sessionId: 'session-1',
          orderIds: [],
          subtotal: 128000,
          total: 128000,
          roundingAmount: 0,
          status: BillStatus.PENDING_PAYMENT,
          createdAt: '2026-05-10T00:00:00.000Z',
          updatedAt: '2026-05-10T00:00:00.000Z',
        },
        cart: makeCart({ status: 'LOCKED' }),
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(
      <MemoryRouter>
        <RequestPaymentPage />
      </MemoryRouter>,
    );

    const vietQrButton = screen.getByRole('button', { name: /Thanh toán bằng VietQR/i });
    expect(vietQrButton).toHaveProperty('disabled', false);

    fireEvent.click(vietQrButton);

    await waitFor(() => {
      expect(screen.getByText(/QRTBLB1A2C3D4/)).toBeTruthy();
    });
  });
});
