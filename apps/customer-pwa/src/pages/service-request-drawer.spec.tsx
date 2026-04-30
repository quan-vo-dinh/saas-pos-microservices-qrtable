import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ServiceRequestDrawer } from './service-request-drawer';

const mutateAsyncMock = jest.fn();
const onOpenChangeMock = jest.fn();

jest.mock('@/features/order/hooks/use-order-query', () => ({
  useCreateServiceRequestMutation: () => ({
    mutateAsync: (...args: unknown[]) => mutateAsyncMock(...args),
    isPending: false,
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ServiceRequestDrawer', () => {
  beforeEach(() => {
    mutateAsyncMock.mockResolvedValue({ request: { id: 'req-1' } });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('triggers createServiceRequest mutation with selected type and optional note', async () => {
    render(<ServiceRequestDrawer open onOpenChange={onOpenChangeMock} />);

    fireEvent.click(screen.getByRole('button', { name: /Trợ giúp\s+Câu hỏi chung/i }));
    fireEvent.change(screen.getByLabelText('Ghi chú (tuỳ chọn)'), {
      target: { value: '  cần thêm muỗng  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
    });

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      type: 'GENERAL_HELP',
      note: 'cần thêm muỗng',
    });
    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
  });
});
