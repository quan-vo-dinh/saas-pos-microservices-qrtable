import type { ComponentProps, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { OrderItemStatus, OrderStatus, type Order } from '@einvoice/types';

const mockUseOrderDetailQuery = jest.fn();
const mockUseConfirmOrderMutation = jest.fn();

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, layout: _layout, ...props }: ComponentProps<'div'> & { layout?: boolean }) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/pos/cancel-order-dialog', () => ({
  CancelOrderDialog: () => null,
}));

jest.mock('@einvoice/frontend-ui', () => ({
  Avatar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AvatarImage: (props: ComponentProps<'img'>) => <img {...props} />,
}));

jest.mock('@/features/order/hooks/use-order-query', () => ({
  useOrderDetailQuery: (...args: unknown[]) => mockUseOrderDetailQuery(...args),
  useConfirmOrderMutation: (...args: unknown[]) => mockUseConfirmOrderMutation(...args),
}));

import { OrderDetailPanel } from '../order-detail-panel';

const orderWithCatalogImage = {
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
      menuItemImageUrl: 'https://cdn.example.test/menu/pho-bo.jpg',
      quantity: 1,
      unitPrice: 125000,
      status: OrderItemStatus.PROCESSING,
      createdAt: '2026-05-01T10:00:00.000Z',
      updatedAt: '2026-05-01T10:00:00.000Z',
    },
  ],
} as Order;

describe('OrderDetailPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConfirmOrderMutation.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      variables: null,
    });
  });

  it('renders catalog image URL from order item snapshot', () => {
    mockUseOrderDetailQuery.mockReturnValue({
      data: orderWithCatalogImage,
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<OrderDetailPanel orderId="order-1" />);

    expect((screen.getByAltText('Phở bò') as HTMLImageElement).src).toBe(
      'https://cdn.example.test/menu/pho-bo.jpg',
    );
  });
});
