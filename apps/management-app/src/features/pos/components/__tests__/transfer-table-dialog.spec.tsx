import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

const mockMutate = jest.fn();
const mockOnOpenChange = jest.fn();

jest.mock('@/features/order/lib/transfer-request-id', () => ({
  createTransferRequestId: () => 'd290f1ee-6c54-4b01-90e6-d701748f0851',
}));

jest.mock('@/features/order/hooks/use-order-query', () => ({
  useTransferTableMutation: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

jest.mock('@/features/tables/hooks/use-tables-query', () => ({
  useTablesQuery: () => ({
    data: [
      {
        id: 'to-table-1',
        name: 'B02',
        areaName: 'Main',
        status: 'available',
      },
    ],
  }),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

jest.mock('@/components/ui/command', () => ({
  Command: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandEmpty: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandInput: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input aria-label="Tìm bàn" {...props} />,
  CommandItem: ({
    children,
    disabled,
    onSelect,
  }: {
    children: ReactNode;
    disabled?: boolean;
    onSelect?: () => void;
  }) => (
    <button type="button" disabled={disabled} onClick={() => onSelect?.()}>
      {children}
    </button>
  ),
  CommandList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { TransferTableDialog } from '../transfer-table-dialog';

describe('TransferTableDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates a UUID requestId when transferring from the tables screen', () => {
    render(
      <TransferTableDialog
        open
        onOpenChange={mockOnOpenChange}
        fromTableId="from-table-1"
        sessionId="session-1"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /B02/ }));

    expect(mockMutate).toHaveBeenCalledWith(
      {
        sessionId: 'session-1',
        fromTableId: 'from-table-1',
        toTableId: 'to-table-1',
        requestId: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
      },
      expect.any(Object),
    );
  });

  it('keeps a provided requestId for service-request driven transfers', () => {
    render(
      <TransferTableDialog
        open
        onOpenChange={mockOnOpenChange}
        fromTableId="from-table-1"
        sessionId="session-1"
        requestId="11111111-2222-4333-8444-555555555555"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /B02/ }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: '11111111-2222-4333-8444-555555555555',
      }),
      expect.any(Object),
    );
  });
});
