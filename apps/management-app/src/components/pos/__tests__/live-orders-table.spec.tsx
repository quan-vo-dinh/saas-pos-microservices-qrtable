import type { ComponentProps, ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OrderItemStatus, OrderStatus } from '@einvoice/types';

const mockUseOrdersQuery = jest.fn();
const mockUseConfirmOrderMutation = jest.fn();
const mockUseCancelOrderMutation = jest.fn();
const mockUseTablesQuery = jest.fn();

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'staff-1',
        roles: ['OWNER'],
      },
    },
  }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    tr: ({ children, layout: _layout, ...props }: ComponentProps<'tr'> & { layout?: boolean }) => <tr {...props}>{children}</tr>,
    div: ({ children, layout: _layout, ...props }: ComponentProps<'div'> & { layout?: boolean }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getTotalSize: () => 0,
    getVirtualItems: () => [],
    measureElement: jest.fn(),
  }),
}));

jest.mock('@/components/pos/order-row-context-menu', () => ({
  OrderRowContextMenu: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

jest.mock('@/features/order/hooks/use-order-query', () => ({
  useOrdersQuery: (...args: unknown[]) => mockUseOrdersQuery(...args),
  useConfirmOrderMutation: (...args: unknown[]) => mockUseConfirmOrderMutation(...args),
  useCancelOrderMutation: (...args: unknown[]) => mockUseCancelOrderMutation(...args),
}));

jest.mock('@/features/tables/hooks/use-tables-query', () => ({
  useTablesQuery: (...args: unknown[]) => mockUseTablesQuery(...args),
}));

import { CancelOrderDialog } from '../cancel-order-dialog';
import { LiveOrdersTable } from '../live-orders-table';
import { useOrderUiState } from '@/features/order/hooks/use-order-ui-state';

const baseOrder = {
  id: 'order-1',
  tenantId: 'tenant-1',
  tableId: 'table-1',
  tableName: 'Bàn 01',
  sessionId: 'session-1',
  status: OrderStatus.PENDING,
  totalAmount: 125000,
  idempotencyKey: 'idem-1',
  createdAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-01T10:00:00.000Z',
  items: [
    {
      id: 'item-1',
      orderId: 'order-1',
      menuItemId: 'menu-1',
      menuItemName: 'Phở bò',
      quantity: 1,
      unitPrice: 125000,
      status: OrderItemStatus.PROCESSING,
      createdAt: '2026-05-01T10:00:00.000Z',
      updatedAt: '2026-05-01T10:00:00.000Z',
    },
  ],
};

describe('POS live order UI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOrderUiState.getState().reset();
    mockUseTablesQuery.mockReturnValue({
      data: [{ id: 'table-1', status: 'occupied', name: 'Bàn 01', areaName: 'Tầng trệt' }],
      isLoading: false,
    });
    mockUseConfirmOrderMutation.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      variables: null,
    });
    mockUseCancelOrderMutation.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });
  });

  it('renders live order rows from the real orders hook', () => {
    mockUseOrdersQuery.mockReturnValue({
      data: [baseOrder],
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<LiveOrdersTable />);

    expect(screen.queryByText('Bàn 01')).not.toBeNull();
    expect(screen.queryByText('Live API · 1 hiển thị')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Nhận' })).not.toBeNull();
  });

  it('disables the confirm button while the matching confirm mutation is pending', () => {
    mockUseOrdersQuery.mockReturnValue({
      data: [baseOrder],
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseConfirmOrderMutation.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: true,
      variables: 'order-1',
    });

    render(<LiveOrdersTable />);

    expect((screen.getByRole('button', { name: 'Đang nhận...' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps the captured cancel status if the row disappears after the dialog opens', async () => {
    const mutate = jest.fn();
    mockUseCancelOrderMutation.mockReturnValue({
      mutate,
      isPending: false,
    });

    const queryState = {
      data: [baseOrder],
      isLoading: false,
      isError: false,
      error: null,
    };
    mockUseOrdersQuery.mockImplementation(() => queryState);

    const { rerender } = render(<LiveOrdersTable />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Từ chối' }));
    });

    queryState.data = [];
    rerender(<LiveOrdersTable />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Xác nhận huỷ' }));
    });

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith({
        orderId: 'order-1',
        status: OrderStatus.PENDING,
        reason: 'Hết hàng',
      }, expect.any(Object));
    });
  });

  it('passes processing status through the cancel dialog action', async () => {
    const mutate = jest.fn();
    mockUseCancelOrderMutation.mockReturnValue({
      mutate,
      isPending: false,
    });

    render(
      <CancelOrderDialog
        open
        onOpenChange={jest.fn()}
        orderId="order-2"
        orderStatus={OrderStatus.PROCESSING}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Xác nhận huỷ' }));
    });

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith({
        orderId: 'order-2',
        status: OrderStatus.PROCESSING,
        reason: 'Hết hàng',
      }, expect.any(Object));
    });
  });
});
