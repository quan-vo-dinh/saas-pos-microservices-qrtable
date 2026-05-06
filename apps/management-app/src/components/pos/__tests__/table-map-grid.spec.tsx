import { render, screen } from '@testing-library/react';
import { OrderStatus } from '@einvoice/types';

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

const mockUseOrdersQuery = jest.fn();

jest.mock('@/features/tables/hooks/use-tables-query', () => ({
  useTablesQuery: () => ({
    data: [
      {
        id: 'table-1',
        name: 'A01',
        areaId: 'area-1',
        areaName: 'Main',
        capacity: 2,
        status: 'available',
        qrToken: 'token-1',
        sessionId: null,
      },
    ],
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

jest.mock('@/features/order/hooks/use-order-query', () => ({
  useOrdersQuery: (...args: unknown[]) => mockUseOrdersQuery(...args),
}));

import { usePosTableUiState } from '@/features/tables/hooks/use-pos-table-ui-state';
import { TableMapGrid } from '../table-map-grid';

describe('TableMapGrid', () => {
  beforeEach(() => {
    usePosTableUiState.getState().selectTable(null);
    mockUseOrdersQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it('renders catalog table names without mock labels', () => {
    render(<TableMapGrid />);

    expect(screen.queryByText('A01')).not.toBeNull();
    expect(screen.queryByText(/mock/i)).toBeNull();
  });

  it('sums active orders per table excluding terminal statuses', () => {
    mockUseOrdersQuery.mockReturnValue({
      data: [
        {
          id: 'order-1',
          tenantId: 't1',
          tableId: 'table-1',
          tableName: 'A01',
          sessionId: 's1',
          status: OrderStatus.PENDING,
          totalAmount: 50000,
          idempotencyKey: 'k1',
          createdAt: '2026-05-01T10:00:00.000Z',
          updatedAt: '2026-05-01T10:00:00.000Z',
          items: [],
        },
        {
          id: 'order-2',
          tenantId: 't1',
          tableId: 'table-1',
          tableName: 'A01',
          sessionId: 's1',
          status: OrderStatus.COMPLETED,
          totalAmount: 99999,
          idempotencyKey: 'k2',
          createdAt: '2026-05-01T10:00:00.000Z',
          updatedAt: '2026-05-01T10:00:00.000Z',
          items: [],
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<TableMapGrid />);

    expect(screen.queryByText(/50\.000/)).not.toBeNull();
  });
});
