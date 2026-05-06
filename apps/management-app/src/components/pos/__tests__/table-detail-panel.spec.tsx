import { render, screen } from '@testing-library/react';
import { OrderStatus } from '@einvoice/types';

const mockUseTablesQuery = jest.fn();
const mockUseOrdersQuery = jest.fn();
const mockMutate = jest.fn();

jest.mock('@/features/tables/hooks/use-tables-query', () => ({
  useTablesQuery: (...args: unknown[]) => mockUseTablesQuery(...args),
}));

jest.mock('@/features/order/hooks/use-order-query', () => ({
  useOrdersQuery: (...args: unknown[]) => mockUseOrdersQuery(...args),
}));

jest.mock('@/features/tables/hooks/use-tables-mutations', () => ({
  useUpdateTableStatusMutation: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

jest.mock('@/components/pos/transfer-table-dialog', () => ({
  TransferTableDialog: ({
    fromTableId,
    sessionId,
    open,
  }: {
    fromTableId?: string | null;
    sessionId?: string | null;
    open: boolean;
  }) => (
    <div
      data-testid="transfer-dialog"
      data-from={fromTableId ?? ''}
      data-session={sessionId ?? ''}
      data-open={open ? 'true' : 'false'}
    />
  ),
}));

import { TableDetailPanel } from '../table-detail-panel';

describe('TableDetailPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTablesQuery.mockReturnValue({
      data: [
        {
          id: 'table-1',
          name: 'A01',
          areaId: 'area-1',
          areaName: 'Main',
          capacity: 2,
          status: 'occupied',
          qrToken: 'token-1',
          sessionId: 'session-real-1',
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseOrdersQuery.mockReturnValue({
      data: [
        {
          id: 'order-active-1',
          tenantId: 't1',
          tableId: 'table-1',
          tableName: 'A01',
          sessionId: 'session-real-1',
          status: OrderStatus.PENDING,
          totalAmount: 80000,
          idempotencyKey: 'k1',
          createdAt: '2026-05-01T10:00:00.000Z',
          updatedAt: '2026-05-01T10:05:00.000Z',
          items: [],
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it('renders real table and running total without mock labels', () => {
    render(<TableDetailPanel tableId="table-1" />);

    expect(screen.queryByText('A01')).not.toBeNull();
    expect(screen.queryByText(/Tổng chạy/)).not.toBeNull();
    expect(screen.queryByText(/mock/i)).toBeNull();
  });

  it('passes real transfer props when session exists', () => {
    render(<TableDetailPanel tableId="table-1" />);

    const dialog = screen.getByTestId('transfer-dialog');
    expect(dialog.getAttribute('data-from')).toBe('table-1');
    expect(dialog.getAttribute('data-session')).toBe('session-real-1');
  });
});
