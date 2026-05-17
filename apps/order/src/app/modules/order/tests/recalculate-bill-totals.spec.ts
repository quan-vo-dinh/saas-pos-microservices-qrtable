import { Bill } from '@common/entities/bill.entity';
import { Order } from '@common/entities/order.entity';
import { BillStatus, OrderStatus } from '@einvoice/types';
import type { EntityManager } from 'typeorm';
import { recalculateBillTotals } from '../utils/recalculate-bill-totals';

describe('recalculateBillTotals', () => {
  it('stores rawTotal, roundedTotal, and roundingDelta on the Order-owned bill snapshot', async () => {
    const bill = {
      id: 'bill-1',
      tenantId: 'tenant-1',
      sessionId: 'session-1',
      orderIds: ['order-1'],
      subtotal: 0,
      total: 0,
      roundingAmount: 0,
      status: BillStatus.OPEN,
    } as Bill;
    const manager = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'order-1',
          tenantId: 'tenant-1',
          status: OrderStatus.SERVED,
          totalAmount: 127_500,
        } as Order,
      ]),
    } as unknown as EntityManager;

    await recalculateBillTotals(manager, bill, 'tenant-1');

    expect(bill.subtotal).toBe(127_500);
    expect(bill.total).toBe(128_000);
    expect(bill.roundingAmount).toBe(500);
  });
});
