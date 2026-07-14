import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CartDrawer } from './cart-drawer';

const useCustomerCartQueryMock = jest.fn();
const useTenantStatusMock = jest.fn();

jest.mock('@/features/order/hooks/use-cart-query', () => ({
  useCustomerCartQuery: () => useCustomerCartQueryMock(),
  useCartMutations: () => ({
    setQuantity: jest.fn(),
    updateNote: jest.fn(),
    removeLine: jest.fn(),
    clearCart: jest.fn(),
    isUpdating: false,
  }),
}));

jest.mock('@/features/order/hooks/use-order-query', () => ({
  useSubmitOrderMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('@/features/tenant/use-tenant-status', () => ({
  useTenantStatus: () => useTenantStatusMock(),
}));

jest.mock('@/mocks/store', () => ({
  usePwaMockStore: () => [],
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe('CartDrawer tenant lifecycle behavior', () => {
  beforeEach(() => {
    useCustomerCartQueryMock.mockReturnValue({
      isLoading: false,
      data: {
        items: [
          {
            cartLineId: 'line-1',
            menuItemName: 'Phở bò',
            unitPrice: 65000,
            quantity: 1,
            note: '',
            lineVersion: 1,
          },
        ],
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('disables order submission when tenant is suspended', () => {
    useTenantStatusMock.mockReturnValue({ status: 'SUSPENDED', reason: 'expired', canOrder: false });

    render(
      <MemoryRouter>
        <CartDrawer open onOpenChange={jest.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Cửa hàng tạm không nhận đơn mới — bạn vẫn xem được giỏ đã chọn.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Đặt món' })).toHaveProperty('disabled', true);
  });
});
