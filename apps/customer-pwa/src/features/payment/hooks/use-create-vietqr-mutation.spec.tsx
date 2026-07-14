import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useCreateVietQrMutation } from './use-create-vietqr-mutation';

const createVietQrMock = jest.fn();

jest.mock('../services/payment.service', () => ({
  paymentService: {
    createVietQrForCurrentBill: (...args: unknown[]) => createVietQrMock(...args),
  },
}));

describe('useCreateVietQrMutation', () => {
  it('creates VietQR through the payment service', async () => {
    const response = { id: 'payment-1', qrUrl: 'https://qr.example.test/payment-1' };
    createVietQrMock.mockResolvedValue(response);
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateVietQrMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(createVietQrMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.data).toEqual(response));
  });
});
