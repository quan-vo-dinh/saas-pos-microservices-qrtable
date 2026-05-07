import {
  activeQueueKey,
  globalSlaDueKey,
  orderTicketsKey,
  readyQueueKey,
  revisionKey,
  slaDueMember,
  ticketItemKey,
  ticketItemsKey,
  ticketKey,
} from '../utils/kds-keys';

describe('KDS Redis key builders', () => {
  it('builds core ticket and queue keys', () => {
    expect(ticketKey('tenant-a', 'ticket-1')).toBe('kds:tenant-a:ticket:ticket-1');
    expect(ticketItemsKey('tenant-a', 'ticket-1')).toBe('kds:tenant-a:ticket:ticket-1:items');
    expect(ticketItemKey('tenant-a', 'item-1')).toBe('kds:tenant-a:ticket-item:item-1');
    expect(orderTicketsKey('tenant-a', 'order-1')).toBe('kds:tenant-a:order:order-1:tickets');
    expect(activeQueueKey('tenant-a', 'KITCHEN')).toBe('kds:tenant-a:kitchen');
    expect(activeQueueKey('tenant-a', 'BAR')).toBe('kds:tenant-a:bar');
    expect(readyQueueKey('tenant-a', 'KITCHEN')).toBe('kds:tenant-a:station:KITCHEN:READY');
    expect(revisionKey('tenant-a', 'KITCHEN')).toBe('kds:tenant-a:station:KITCHEN:revision');
    expect(globalSlaDueKey()).toBe('kds:sla:due');
    expect(slaDueMember('tenant-a', 'BAR', 'ticket-1', 'WARNING')).toBe('tenant-a|BAR|ticket-1|WARNING');
  });
});
