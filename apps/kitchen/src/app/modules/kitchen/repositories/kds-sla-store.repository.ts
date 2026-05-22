import { RedisClientService } from '@common/providers/redis-client/redis-client.service';
import { Injectable } from '@nestjs/common';
import {
  KdsTicketItemStatus,
  KdsTicketStatus,
  type KdsTicketDto,
  type KdsTicketItemDto,
  type KdsWarningLevel,
  type PreparationStation,
} from '@einvoice/types';
import {
  globalSlaDueKey,
  slaClaimKey,
  slaDedupeKey,
  ticketItemKey,
  ticketItemsKey,
  ticketKey,
  ticketSlaKey,
} from '../utils/kds-keys';

type RedisClient = ReturnType<RedisClientService['getClient']>;
type TicketHash = Record<string, string>;

@Injectable()
export class KdsSlaStoreRepository {
  private readonly redis: RedisClient;

  constructor(redisClientService: RedisClientService) {
    this.redis = redisClientService.getClient();
  }

  async claimDueSla(nowMs: number, limit: number): Promise<string[]> {
    return this.redis.zrangebyscore(globalSlaDueKey(), '-inf', nowMs, 'LIMIT', 0, limit);
  }

  async acquireSlaClaim(member: string): Promise<boolean> {
    const ok = await this.redis.set(slaClaimKey(member), '1', 'EX', 30, 'NX');
    return ok === 'OK';
  }

  async releaseSlaClaim(member: string): Promise<void> {
    await this.redis.del(slaClaimKey(member));
  }

  async trySetSlaDedupe(
    tenantId: string,
    ticketId: string,
    level: 'WARNING' | 'BREACH',
    bucket: string,
  ): Promise<boolean> {
    const key = slaDedupeKey(tenantId, ticketId, level, bucket);
    const ok = await this.redis.set(key, '1', 'EX', 86400, 'NX');
    return ok === 'OK';
  }

  async removeSlaDueMember(member: string): Promise<void> {
    await this.redis.zrem(globalSlaDueKey(), member);
  }

  async updateTicketLastWarningLevel(tenantId: string, ticketId: string, level: KdsWarningLevel): Promise<void> {
    const now = new Date().toISOString();
    await this.redis.hset(ticketKey(tenantId, ticketId), {
      lastWarningLevel: level,
      updatedAt: now,
    });
    await this.redis.hset(ticketSlaKey(tenantId, ticketId), {
      lastWarningLevel: level,
    });
  }

  async findTicketForSla(tenantId: string, ticketId: string): Promise<KdsTicketDto | null> {
    const hash = await this.redis.hgetall(ticketKey(tenantId, ticketId));
    if (!hash?.ticketId) {
      return null;
    }
    const itemIds = await this.redis.smembers(ticketItemsKey(tenantId, ticketId));
    const items: KdsTicketItemDto[] = [];
    for (const itemId of itemIds) {
      const itemHash = await this.redis.hgetall(ticketItemKey(tenantId, itemId));
      if (itemHash?.ticketItemId) {
        items.push(this.toItemDto(itemHash));
      }
    }
    return this.toTicketDto(hash, items, 0);
  }

  private toTicketDto(hash: TicketHash, items: KdsTicketItemDto[], queuePosition: number): KdsTicketDto {
    const confirmedAtMs = Date.parse(hash.confirmedAt);
    return {
      ticketId: hash.ticketId,
      tenantId: hash.tenantId,
      orderId: hash.orderId,
      sessionId: hash.sessionId,
      tableId: hash.tableId,
      tableName: hash.tableName,
      station: hash.station as PreparationStation,
      status: hash.status as KdsTicketStatus,
      priority: hash.priority === '1',
      queueScore: Number(hash.queueScore || 0),
      queuePosition,
      confirmedAt: hash.confirmedAt,
      createdAt: hash.createdAt,
      startedAt: hash.startedAt || undefined,
      readyAt: hash.readyAt || undefined,
      recallUntil: hash.recallUntil || undefined,
      slaSeconds: Number(hash.slaSeconds || 0),
      slaDueAt: hash.slaDueAt,
      waitTimeSeconds: Number.isFinite(confirmedAtMs)
        ? Math.max(0, Math.floor((Date.now() - confirmedAtMs) / 1000))
        : 0,
      warningLevel: (hash.lastWarningLevel || 'NONE') as KdsWarningLevel,
      recovered: hash.recovered === '1',
      items,
    };
  }

  private toItemDto(hash: TicketHash): KdsTicketItemDto {
    return {
      ticketItemId: hash.ticketItemId,
      orderItemId: hash.orderItemId,
      menuItemId: hash.menuItemId,
      menuItemName: hash.menuItemName,
      quantity: Number(hash.quantity || 0),
      unitPrice: Number(hash.unitPrice || 0),
      note: hash.note || undefined,
      status: hash.status as KdsTicketItemStatus,
    };
  }
}
