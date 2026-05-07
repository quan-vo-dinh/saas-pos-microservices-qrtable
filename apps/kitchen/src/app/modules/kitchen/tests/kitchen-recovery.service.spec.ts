import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type { KdsActiveOrderSnapshot } from '@einvoice/types';
import { KdsRedisRepository } from '../repositories/kds-redis.repository';
import { KitchenEventsPublisher } from '../services/kitchen-events.publisher';
import { KitchenRecoveryService } from '../services/kitchen-recovery.service';
import { rebuildLockKey, ticketKey } from '../utils/kds-keys';
import { FakeRedis, redisService } from './fake-redis';
import { of } from 'rxjs';

describe('KitchenRecoveryService', () => {
  function setup(orderSnapshots: KdsActiveOrderSnapshot[]) {
    const redis = new FakeRedis();
    const repository = new KdsRedisRepository(redisService(redis) as never);
    const publisher = new KitchenEventsPublisher(redisService(redis) as never);

    const orderClient: Pick<TcpClient, 'send'> = {
      send: jest.fn().mockReturnValue(of(Response.success(orderSnapshots))),
    };

    const recovery = new KitchenRecoveryService(orderClient as TcpClient, repository, publisher);
    return { redis, repository, publisher, orderClient, recovery };
  }

  const snapshot = (orderId: string): KdsActiveOrderSnapshot => ({
    tenantId: 'tenant-a',
    orderId,
    sessionId: 'session-1',
    tableId: 't1',
    tableName: 'A1',
    confirmedAt: '2026-05-07T10:00:00.000Z',
    confirmedByUserId: 'staff-1',
    items: [
      {
        id: `${orderId}-line`,
        orderId,
        menuItemId: 'm1',
        menuItemName: 'Cà phê',
        quantity: 1,
        unitPrice: 50,
        status: 'PROCESSING',
        station: 'BAR',
        createdAt: '2026-05-07T10:00:00.000Z',
        updatedAt: '2026-05-07T10:00:00.000Z',
      },
      {
        id: `${orderId}-ready`,
        orderId,
        menuItemId: 'm2',
        menuItemName: 'Done',
        quantity: 1,
        unitPrice: 50,
        status: 'READY',
        station: 'BAR',
        createdAt: '2026-05-07T10:00:00.000Z',
        updatedAt: '2026-05-07T10:00:00.000Z',
      },
    ],
  });

  it('acquires rebuild lock, fetches active orders, rebuilds missing tickets, emits SNAPSHOT_REBUILT, releases lock', async () => {
    const { redis, orderClient, recovery } = setup([snapshot('order-rec')]);

    const result = await recovery.rebuildTenant({
      tenantId: 'tenant-a',
      requestId: 'req-1',
    });

    expect(orderClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.ORDER.KDS_ACTIVE_ORDERS_GET,
      expect.objectContaining({
        data: {
          tenantId: 'tenant-a',
          station: undefined,
        },
      }),
    );
    expect(result.rebuiltTickets).toBe(1);
    expect(result.revision).toBeGreaterThan(0);

    const ticketHash = await redis.hgetall(ticketKey('tenant-a', 'order-rec:BAR'));
    expect(ticketHash.recovered).toBe('1');
    expect(ticketHash.status).toBe('PENDING');

    const rebuiltEvent = redis.published.map((p) => JSON.parse(p.payload)).find((e) => e.reason === 'SNAPSHOT_REBUILT');
    expect(rebuiltEvent).toBeDefined();

    expect(await redis.get(rebuildLockKey('tenant-a'))).toBeNull();
  });

  it('returns no-op when lock is already held', async () => {
    const { redis, orderClient, recovery } = setup([snapshot('order-2')]);
    await redis.set(rebuildLockKey('tenant-a'), 'other');

    const result = await recovery.rebuildTenant({
      tenantId: 'tenant-a',
      requestId: 'req-x',
    });

    expect(result.rebuiltTickets).toBe(0);
    expect(orderClient.send).not.toHaveBeenCalled();
  });

  it('filters by station when rebuilding', async () => {
    const { orderClient, recovery } = setup([snapshot('order-st')]);

    await recovery.rebuildTenant({
      tenantId: 'tenant-a',
      station: 'KITCHEN',
      requestId: 'req-2',
    });

    expect(orderClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.ORDER.KDS_ACTIVE_ORDERS_GET,
      expect.objectContaining({
        data: {
          tenantId: 'tenant-a',
          station: 'KITCHEN',
        },
      }),
    );
  });
});
