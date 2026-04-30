import { Bill } from '@common/entities/bill.entity';
import { Order } from '@common/entities/order.entity';
import { OrderStatus } from '@einvoice/types';
import { EntityManager, In } from 'typeorm';

/**
 * Recomputes bill roll-up from `bill.orderIds`, excluding canceled orders.
 */
export async function recalculateBillTotals(manager: EntityManager, bill: Bill, tenantId: string): Promise<void> {
  const ids = (bill.orderIds ?? []).filter(Boolean);
  if (ids.length === 0) {
    bill.subtotal = 0;
    bill.total = bill.roundingAmount;
    return;
  }
  const orders = await manager.find(Order, { where: { id: In(ids), tenantId } });
  const byId = new Map(orders.map((o) => [o.id, o]));
  bill.subtotal = ids.reduce((sum, id) => {
    const o = byId.get(id);
    if (!o || o.status === OrderStatus.CANCELED) {
      return sum;
    }
    return sum + o.totalAmount;
  }, 0);
  bill.total = bill.subtotal + bill.roundingAmount;
}
