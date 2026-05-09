const mockAuthApiClient = jest.fn();

jest.mock('@/lib/api/authenticated-client', () => ({
  authApiClient: (...args: unknown[]) => mockAuthApiClient(...args),
}));

import { API_CONFIG } from '@/constants/api';
import { BillStatus, OrderStatus } from '@einvoice/types';
import { orderService } from '../order.service';

const { ADMIN_ORDERS, ADMIN_TABLES_TRANSFER, ADMIN_BILLS, ADMIN_BILLS_REOPEN } = API_CONFIG.ENDPOINTS;

describe('orderService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('lists orders with encoded query params', async () => {
    mockAuthApiClient.mockResolvedValue([]);

    await orderService.getOrders({
      status: OrderStatus.PENDING,
      tableId: 'table/1',
      limit: 25,
      offset: 50,
    });

    expect(mockAuthApiClient).toHaveBeenCalledWith(
      `${ADMIN_ORDERS}?status=${encodeURIComponent(OrderStatus.PENDING)}&tableId=${encodeURIComponent('table/1')}&limit=25&offset=50`,
    );
  });

  it('lists bills with encoded query params', async () => {
    mockAuthApiClient.mockResolvedValue([]);

    await orderService.getBills({
      status: BillStatus.PENDING_PAYMENT,
      limit: 25,
      offset: 50,
    });

    expect(mockAuthApiClient).toHaveBeenCalledWith(
      `${ADMIN_BILLS}?status=${encodeURIComponent(BillStatus.PENDING_PAYMENT)}&limit=25&offset=50`,
    );
  });

  it('gets order detail by id', async () => {
    mockAuthApiClient.mockResolvedValue({ id: 'order-1' });

    await orderService.getOrder('order-1');

    expect(mockAuthApiClient).toHaveBeenCalledWith(`${ADMIN_ORDERS}/order-1`);
  });

  it('posts confirm to the admin confirm endpoint', async () => {
    mockAuthApiClient.mockResolvedValue({ id: 'order-1' });

    await orderService.confirmOrder('order-1');

    expect(mockAuthApiClient).toHaveBeenCalledWith(`${ADMIN_ORDERS}/order-1/confirm`, {
      method: 'POST',
    });
  });

  it('posts serve to the admin serve endpoint', async () => {
    mockAuthApiClient.mockResolvedValue({ id: 'order-1' });

    await orderService.markOrderServed('order-1');

    expect(mockAuthApiClient).toHaveBeenCalledWith(`${ADMIN_ORDERS}/order-1/serve`, {
      method: 'POST',
    });
  });

  it('posts cancel pending with an optional reason body', async () => {
    mockAuthApiClient.mockResolvedValue({ id: 'order-1' });

    await orderService.cancelPendingOrder('order-1', { reason: 'Hết hàng' });

    expect(mockAuthApiClient).toHaveBeenCalledWith(`${ADMIN_ORDERS}/order-1/cancel-pending`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Hết hàng' }),
    });
  });

  it('posts cancel processing with a required reason body', async () => {
    mockAuthApiClient.mockResolvedValue({ id: 'order-1' });

    await orderService.cancelProcessingOrder('order-1', { reason: 'Khách đổi ý' });

    expect(mockAuthApiClient).toHaveBeenCalledWith(`${ADMIN_ORDERS}/order-1/cancel-processing`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Khách đổi ý' }),
    });
  });

  it('posts table transfer payload to the admin transfer endpoint', async () => {
    mockAuthApiClient.mockResolvedValue({ sessionId: 'session-1' });

    await orderService.transferTable({
      sessionId: 'session-1',
      fromTableId: 'table-1',
      toTableId: 'table-2',
      requestId: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
    });

    expect(mockAuthApiClient).toHaveBeenCalledWith(ADMIN_TABLES_TRANSFER, {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'session-1',
        fromTableId: 'table-1',
        toTableId: 'table-2',
        requestId: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
      }),
    });
  });

  it('posts bill reopen to the session-specific endpoint', async () => {
    mockAuthApiClient.mockResolvedValue({ sessionId: 'session-1' });

    await orderService.reopenBill('session-1');

    expect(mockAuthApiClient).toHaveBeenCalledWith(`${ADMIN_BILLS_REOPEN}/session-1/reopen`, {
      method: 'POST',
    });
  });
});
