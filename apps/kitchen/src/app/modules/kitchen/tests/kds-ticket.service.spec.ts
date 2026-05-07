import { BusinessException } from '@common/error-messages/business.exception';
import { KdsRedisRepository } from '../repositories/kds-redis.repository';
import { KdsTicketService } from '../services/kds-ticket.service';
import { KitchenEventsPublisher } from '../services/kitchen-events.publisher';
import { activeQueueKey, readyQueueKey, ticketKey } from '../utils/kds-keys';
import { FakeRedis, redisService } from './fake-redis';
import type { OrderConfirmedEvent } from '@einvoice/types';

function event(orderId: string, confirmedAt: string, itemId = `${orderId}-item`): OrderConfirmedEvent {
  return {
    eventId: `evt-${orderId}`,
    eventType: 'order.confirmed',
    schemaVersion: 1,
    tenantId: 'tenant-a',
    orderId,
    sessionId: 'session-1',
    tableId: 'table-1',
    tableName: 'A1',
    totalAmount: 100,
    confirmedAt,
    confirmedByUserId: 'staff-1',
    occurredAt: confirmedAt,
    items: [
      {
        id: itemId,
        orderId,
        menuItemId: `menu-${itemId}`,
        menuItemName: `Item ${itemId}`,
        quantity: 1,
        unitPrice: 100,
        status: 'PROCESSING',
        station: 'KITCHEN',
        createdAt: confirmedAt,
        updatedAt: confirmedAt,
      },
    ],
  };
}

describe('KdsTicketService', () => {
  function setup() {
    const redis = new FakeRedis();
    const repository = new KdsRedisRepository(redisService(redis) as never);
    const publisher = new KitchenEventsPublisher(redisService(redis) as never);
    const service = new KdsTicketService(repository, publisher);
    return { redis, repository, service };
  }

  it('returns queue tickets sorted by priority and FIFO', async () => {
    const { repository, service } = setup();
    await repository.createTicketsFromConfirmedOrder(event('order-1', '2026-05-07T10:00:00.000Z'));
    await repository.createTicketsFromConfirmedOrder(event('order-2', '2026-05-07T10:01:00.000Z'));

    await service.setPriority({
      tenantId: 'tenant-a',
      ticketId: 'order-2:KITCHEN',
      station: 'KITCHEN',
      userId: 'manager-1',
      requestId: 'priority-1',
      priority: true,
    });

    const snapshot = await service.getQueue({ tenantId: 'tenant-a', station: 'KITCHEN' });
    expect(snapshot.tickets.map((ticket) => ticket.ticketId)).toEqual(['order-2:KITCHEN', 'order-1:KITCHEN']);
    expect(snapshot.tickets.map((ticket) => ticket.queuePosition)).toEqual([1, 2]);
  });

  it('starts a pending ticket and publishes TICKET_STARTED once for the same request', async () => {
    const { redis, repository, service } = setup();
    await repository.createTicketsFromConfirmedOrder(event('order-1', '2026-05-07T10:00:00.000Z'));
    redis.published.length = 0;

    const first = await service.startTicket({
      tenantId: 'tenant-a',
      ticketId: 'order-1:KITCHEN',
      station: 'KITCHEN',
      userId: 'chef-1',
      requestId: 'start-1',
    });
    const second = await service.startTicket({
      tenantId: 'tenant-a',
      ticketId: 'order-1:KITCHEN',
      station: 'KITCHEN',
      userId: 'chef-1',
      requestId: 'start-1',
    });

    expect(first.ticket.status).toBe('PROCESSING');
    expect(second.ticket.status).toBe('PROCESSING');
    expect(second.ticket.items.every((item) => item.status === 'PROCESSING')).toBe(true);
    expect(redis.published).toHaveLength(1);
    expect(JSON.parse(redis.published[0].payload).reason).toBe('TICKET_STARTED');
  });

  it('marks processing tickets ready and moves them to the ready queue', async () => {
    const { redis, repository, service } = setup();
    await repository.createTicketsFromConfirmedOrder(event('order-1', '2026-05-07T10:00:00.000Z'));
    await service.startTicket({
      tenantId: 'tenant-a',
      ticketId: 'order-1:KITCHEN',
      station: 'KITCHEN',
      userId: 'chef-1',
      requestId: 'start-1',
    });
    redis.published.length = 0;

    const result = await service.markReady({
      tenantId: 'tenant-a',
      ticketId: 'order-1:KITCHEN',
      station: 'KITCHEN',
      userId: 'chef-1',
      requestId: 'ready-1',
    });

    expect(result.ticket.status).toBe('READY');
    expect(result.ticket.recallUntil).toBeDefined();
    expect(await redis.zrange(activeQueueKey('tenant-a', 'KITCHEN'), 0, -1)).toEqual([]);
    expect(await redis.zrange(readyQueueKey('tenant-a', 'KITCHEN'), 0, -1)).toEqual(['order-1:KITCHEN']);
    expect(JSON.parse(redis.published[0].payload).reason).toBe('TICKET_READY');
  });

  it('includes ready-queue tickets in the queue snapshot', async () => {
    const { repository, service } = setup();
    await repository.createTicketsFromConfirmedOrder(event('order-1', '2026-05-07T10:00:00.000Z'));
    await service.startTicket({
      tenantId: 'tenant-a',
      ticketId: 'order-1:KITCHEN',
      station: 'KITCHEN',
      userId: 'chef-1',
      requestId: 'start-1',
    });
    await service.markReady({
      tenantId: 'tenant-a',
      ticketId: 'order-1:KITCHEN',
      station: 'KITCHEN',
      userId: 'chef-1',
      requestId: 'ready-1',
    });

    const snapshot = await service.getQueue({ tenantId: 'tenant-a', station: 'KITCHEN' });
    expect(snapshot.tickets).toHaveLength(1);
    expect(snapshot.tickets[0].ticketId).toBe('order-1:KITCHEN');
    expect(snapshot.tickets[0].status).toBe('READY');
  });

  it('recalls ready tickets only inside the recall window', async () => {
    const { redis, repository, service } = setup();
    await repository.createTicketsFromConfirmedOrder(event('order-1', '2026-05-07T10:00:00.000Z'));
    await service.startTicket({
      tenantId: 'tenant-a',
      ticketId: 'order-1:KITCHEN',
      station: 'KITCHEN',
      userId: 'chef-1',
      requestId: 'start-1',
    });
    await service.markReady({
      tenantId: 'tenant-a',
      ticketId: 'order-1:KITCHEN',
      station: 'KITCHEN',
      userId: 'chef-1',
      requestId: 'ready-1',
    });

    const recalled = await service.recallTicket({
      tenantId: 'tenant-a',
      ticketId: 'order-1:KITCHEN',
      station: 'KITCHEN',
      userId: 'chef-1',
      requestId: 'recall-1',
    });
    expect(recalled.ticket.status).toBe('PROCESSING');

    await service.markReady({
      tenantId: 'tenant-a',
      ticketId: 'order-1:KITCHEN',
      station: 'KITCHEN',
      userId: 'chef-1',
      requestId: 'ready-2',
    });
    await redis.hset(ticketKey('tenant-a', 'order-1:KITCHEN'), {
      recallUntil: '2020-01-01T00:00:00.000Z',
    });

    await expect(
      service.recallTicket({
        tenantId: 'tenant-a',
        ticketId: 'order-1:KITCHEN',
        station: 'KITCHEN',
        userId: 'chef-1',
        requestId: 'recall-2',
      }),
    ).rejects.toThrow(BusinessException);
  });

  it('voids all tickets for an order and removes queue members', async () => {
    const { redis, repository, service } = setup();
    await repository.createTicketsFromConfirmedOrder(event('order-1', '2026-05-07T10:00:00.000Z'));
    redis.published.length = 0;

    await service.voidByOrder({
      tenantId: 'tenant-a',
      orderId: 'order-1',
      reason: 'ORDER_CANCELED',
    });

    expect((await redis.hgetall(ticketKey('tenant-a', 'order-1:KITCHEN'))).status).toBe('VOIDED');
    expect(await redis.zrange(activeQueueKey('tenant-a', 'KITCHEN'), 0, -1)).toEqual([]);
    expect(JSON.parse(redis.published[0].payload).reason).toBe('TICKET_VOIDED');
  });

  it('does not write forbidden grouped-prep keys or fields in lifecycle commands', async () => {
    const { redis, repository, service } = setup();
    await repository.createTicketsFromConfirmedOrder(event('order-1', '2026-05-07T10:00:00.000Z'));
    await service.startTicket({
      tenantId: 'tenant-a',
      ticketId: 'order-1:KITCHEN',
      station: 'KITCHEN',
      userId: 'chef-1',
      requestId: 'start-1',
    });

    const writtenKeys = [
      ...redis.hashes.keys(),
      ...redis.sets.keys(),
      ...redis.sortedSets.keys(),
      ...redis.strings.keys(),
    ].join('\n');
    const writtenFields = [...redis.hashes.values()].flatMap((hash) => Object.keys(hash)).join('\n');

    expect(`${writtenKeys}\n${writtenFields}`).not.toMatch(
      /prepSignature|activeQuantity|batchId|batchTotal|batchQuantity|batch/,
    );
  });
});
