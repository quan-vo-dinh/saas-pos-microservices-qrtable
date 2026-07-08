import type { PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OrderStatus } from '@einvoice/types';

const mockConfirmOrder = jest.fn();
const mockMarkOrderServed = jest.fn();
const mockCancelPendingOrder = jest.fn();
const mockCancelProcessingOrder = jest.fn();
const mockTransferTable = jest.fn();
const mockReopenBill = jest.fn();
const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();

jest.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

jest.mock('@einvoice/frontend-utils', () => ({
  getErrorDisplayMessage: (error: Error) => error.message,
  successMessage: (_action: string, entity?: string) => entity ?? 'success',
}));

jest.mock('../../services/order.service', () => ({
  orderService: {
    confirmOrder: (...args: unknown[]) => mockConfirmOrder(...args),
    markOrderServed: (...args: unknown[]) => mockMarkOrderServed(...args),
    cancelPendingOrder: (...args: unknown[]) => mockCancelPendingOrder(...args),
    cancelProcessingOrder: (...args: unknown[]) => mockCancelProcessingOrder(...args),
    transferTable: (...args: unknown[]) => mockTransferTable(...args),
    reopenBill: (...args: unknown[]) => mockReopenBill(...args),
  },
}));

import { orderKeys } from '../../order-keys';
import {
  useCancelOrderMutation,
  useConfirmOrderMutation,
  useMarkOrderServedMutation,
  useReopenBillMutation,
  useTransferTableMutation,
} from '../use-order-query';

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('order mutations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invalidates order list and detail after confirm succeeds', async () => {
    mockConfirmOrder.mockResolvedValue({ id: 'order-1' });
    const queryClient = new QueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);

    const { result } = renderHook(() => useConfirmOrderMutation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync('order-1');
    });

    await waitFor(() => {
      expect(mockConfirmOrder).toHaveBeenCalledWith('order-1');
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: orderKeys.lists() });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: orderKeys.details() });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: orderKeys.detail('order-1') });
  });

  it('invalidates order list and detail after mark-served succeeds', async () => {
    mockMarkOrderServed.mockResolvedValue({ id: 'order-1' });
    const queryClient = new QueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);

    const { result } = renderHook(() => useMarkOrderServedMutation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync('order-1');
    });

    await waitFor(() => {
      expect(mockMarkOrderServed).toHaveBeenCalledWith('order-1');
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: orderKeys.lists() });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: orderKeys.details() });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: orderKeys.detail('order-1') });
  });

  it('uses cancel-pending for pending orders and invalidates list/detail', async () => {
    mockCancelPendingOrder.mockResolvedValue({ id: 'order-1' });
    const queryClient = new QueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);

    const { result } = renderHook(() => useCancelOrderMutation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        orderId: 'order-1',
        status: OrderStatus.PENDING,
        reason: 'Hết hàng',
      });
    });

    await waitFor(() => {
      expect(mockCancelPendingOrder).toHaveBeenCalledWith('order-1', { reason: 'Hết hàng' });
    });
    expect(mockCancelProcessingOrder).not.toHaveBeenCalled();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: orderKeys.lists() });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: orderKeys.details() });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: orderKeys.detail('order-1') });
  });

  it('uses cancel-processing for processing orders', async () => {
    mockCancelProcessingOrder.mockResolvedValue({ id: 'order-1' });
    const queryClient = new QueryClient();

    const { result } = renderHook(() => useCancelOrderMutation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        orderId: 'order-1',
        status: OrderStatus.PROCESSING,
        reason: 'Khách đổi ý',
      });
    });

    await waitFor(() => {
      expect(mockCancelProcessingOrder).toHaveBeenCalledWith('order-1', { reason: 'Khách đổi ý' });
    });
    expect(mockCancelPendingOrder).not.toHaveBeenCalled();
  });

  it('invalidates order list and detail queries after transfer succeeds', async () => {
    mockTransferTable.mockResolvedValue({ sessionId: 'session-1' });
    const queryClient = new QueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);

    const { result } = renderHook(() => useTransferTableMutation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        sessionId: 'session-1',
        fromTableId: 'table-1',
        toTableId: 'table-2',
        requestId: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
      });
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: orderKeys.lists() });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: orderKeys.details() });
  });

  it('invalidates order list and detail queries after bill reopen succeeds', async () => {
    mockReopenBill.mockResolvedValue({ sessionId: 'session-1' });
    const queryClient = new QueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);

    const { result } = renderHook(() => useReopenBillMutation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync('session-1');
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: orderKeys.lists() });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: orderKeys.details() });
  });
});
