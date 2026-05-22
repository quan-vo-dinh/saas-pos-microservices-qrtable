import { RedisClientService } from '@common/providers/redis-client/redis-client.service';
import { Injectable } from '@nestjs/common';
import type {
  KdsActiveOrderSnapshot,
  KdsQueueChangedEvent,
  OrderConfirmedEvent,
  OrderConfirmedEventItem,
  PreparationStation,
} from '@einvoice/types';
import { rebuildLockKey, ticketKey } from '../utils/kds-keys';
import { KdsTicketStoreRepository } from './kds-ticket-store.repository';

type RedisClient = ReturnType<RedisClientService['getClient']>;

@Injectable()
export class KdsRecoveryStoreRepository {
  private readonly redis: RedisClient;

  constructor(
    redisClientService: RedisClientService,
    private readonly ticketStore: KdsTicketStoreRepository,
  ) {
    this.redis = redisClientService.getClient();
  }

  async rebuildMissingTicketsFromSnapshots(
    snapshots: KdsActiveOrderSnapshot[],
    stationFilter?: PreparationStation,
  ): Promise<{ events: KdsQueueChangedEvent[]; rebuiltCount: number }> {
    const events: KdsQueueChangedEvent[] = [];
    let rebuiltCount = 0;

    for (const snap of snapshots) {
      const byStation = new Map<PreparationStation, OrderConfirmedEventItem[]>();
      for (const item of snap.items) {
        if (!item.station) {
          continue;
        }
        if (item.status === 'READY' || item.status === 'SERVED' || item.status === 'CANCELED') {
          continue;
        }
        const stationItems = byStation.get(item.station) || [];
        stationItems.push(item);
        byStation.set(item.station, stationItems);
      }

      for (const [station, items] of byStation.entries()) {
        if (stationFilter && station !== stationFilter) {
          continue;
        }
        const ticketId = this.ticketId(snap.orderId, station);
        const exists = await this.redis.exists(ticketKey(snap.tenantId, ticketId));
        if (exists) {
          continue;
        }

        const totalAmount = items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
        const synthetic: OrderConfirmedEvent = {
          eventId: `rebuild:${snap.tenantId}:${snap.orderId}:${station}`,
          eventType: 'order.confirmed',
          schemaVersion: 1,
          tenantId: snap.tenantId,
          orderId: snap.orderId,
          sessionId: snap.sessionId,
          tableId: snap.tableId,
          tableName: snap.tableName,
          items,
          totalAmount,
          confirmedAt: snap.confirmedAt,
          confirmedByUserId: snap.confirmedByUserId || 'system',
          occurredAt: new Date().toISOString(),
          correlationId: snap.correlationId,
        };

        const created = await this.ticketStore.createTicketsFromConfirmedOrder(synthetic, { recovered: true });
        if (created.length) {
          rebuiltCount += created.length;
          events.push(...created);
        }
      }
    }

    return { events, rebuiltCount };
  }

  async tryAcquireRebuildLock(tenantId: string, token: string, ttlSeconds = 120): Promise<boolean> {
    const ok = await this.redis.set(rebuildLockKey(tenantId), token, 'EX', ttlSeconds, 'NX');
    return ok === 'OK';
  }

  async releaseRebuildLockIfHeld(tenantId: string, token: string): Promise<void> {
    const key = rebuildLockKey(tenantId);
    const current = await this.redis.get(key);
    if (current === token) {
      await this.redis.del(key);
    }
  }

  private ticketId(orderId: string, station: PreparationStation): string {
    return `${orderId}:${station}`;
  }
}
