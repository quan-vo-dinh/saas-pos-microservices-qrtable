import { ErrorCode } from '@common/error-messages/error-code.enum';
import { BusinessException } from '@common/error-messages/business.exception';
import { RedisClientService } from '@common/providers/redis-client/redis-client.service';
import type {
  KdsMutationTcpResponse,
  KdsPatchTableSnapshotTcpRequest,
  KdsRecallTicketTcpRequest,
  KdsSetPriorityTcpRequest,
  KdsTicketActionTcpRequest,
  KdsVoidByOrderTcpRequest,
} from '@common/interfaces/tcp/kitchen';
import { HttpStatus, Injectable } from '@nestjs/common';
import {
  KdsTicketItemStatus,
  KdsTicketStatus,
  type KdsActiveOrderSnapshot,
  type KdsQueueChangedEvent,
  type KdsQueueChangedReason,
  type KdsQueueSnapshot,
  type KdsTicketDto,
  type KdsTicketItemDto,
  type KdsWarningLevel,
  type OrderConfirmedEvent,
  type OrderConfirmedEventItem,
  type PreparationStation,
} from '@einvoice/types';
import { randomUUID } from 'crypto';
import { CONFIGURATION } from '../../../../configuration';
import { queueScore } from '../utils/kds-score';
import {
  COMMAND_TTL_SECONDS,
  DEAD_LETTER_TTL_SECONDS,
  DEDUPE_TTL_SECONDS,
  activeQueueKey,
  cleanupDueKey,
  commandDedupeKey,
  deadLetterOrderConfirmedKey,
  dedupeEventKey,
  dedupeTicketKey,
  globalSlaDueKey,
  orderTicketsKey,
  rebuildLockKey,
  readyQueueKey,
  revisionKey,
  sessionTicketsKey,
  slaClaimKey,
  slaDedupeKey,
  slaDueMember,
  sourceEventTicketsKey,
  ticketItemKey,
  ticketItemsKey,
  ticketKey,
  ticketSlaKey,
} from '../utils/kds-keys';

type RedisClient = ReturnType<RedisClientService['getClient']>;
type TicketHash = Record<string, string>;
type KdsRepositoryMutationResponse = KdsMutationTcpResponse & { changed?: boolean };

@Injectable()
export class KdsRedisRepository {
  private readonly redis: RedisClient;

  constructor(redisClientService: RedisClientService) {
    this.redis = redisClientService.getClient();
  }

  async getQueueSnapshot(tenantId: string, station: PreparationStation): Promise<KdsQueueSnapshot> {
    const activeIds = await this.redis.zrange(activeQueueKey(tenantId, station), 0, -1);
    const readyIds = await this.redis.zrange(readyQueueKey(tenantId, station), 0, -1);
    const ids = [...activeIds, ...readyIds];
    const tickets = await this.getTicketsByIds(tenantId, ids);
    const revision = Number((await this.redis.get(revisionKey(tenantId, station))) || 0);

    return {
      tenantId,
      station,
      revision,
      serverTime: new Date().toISOString(),
      tickets: tickets.map((ticket, index) => ({ ...ticket, queuePosition: index + 1 })),
    };
  }

  async createTicketsFromConfirmedOrder(
    event: OrderConfirmedEvent,
    options?: { recovered?: boolean },
  ): Promise<KdsQueueChangedEvent[]> {
    const eventLock = await this.redis.set(
      dedupeEventKey(event.tenantId, event.eventId),
      '1',
      'EX',
      DEDUPE_TTL_SECONDS,
      'NX',
    );
    if (eventLock !== 'OK') {
      return [];
    }

    const validItems = await this.partitionValidItems(event);
    const events: KdsQueueChangedEvent[] = [];

    for (const [station, items] of validItems.entries()) {
      const ticketLock = await this.redis.set(
        dedupeTicketKey(event.tenantId, event.orderId, station),
        '1',
        'EX',
        DEDUPE_TTL_SECONDS,
        'NX',
      );
      if (ticketLock !== 'OK') {
        continue;
      }

      const ticketId = this.ticketId(event.orderId, station);
      const confirmedAtMs = Date.parse(event.confirmedAt);
      const score = queueScore(false, confirmedAtMs);
      const now = new Date().toISOString();
      const slaSeconds = CONFIGURATION.KDS_CONFIG.DEFAULT_SLA_SECONDS;
      const slaDueAtMs = confirmedAtMs + slaSeconds * 1000;
      const breachDueAtMs = confirmedAtMs + (slaSeconds + CONFIGURATION.KDS_CONFIG.BREACH_GRACE_SECONDS) * 1000;
      const slaDueAt = new Date(slaDueAtMs).toISOString();
      const recovered = Boolean(options?.recovered);

      const multi = this.redis.multi();
      multi.hset(ticketKey(event.tenantId, ticketId), {
        tenantId: event.tenantId,
        ticketId,
        orderId: event.orderId,
        sessionId: event.sessionId,
        tableId: event.tableId,
        tableName: event.tableName,
        station,
        status: KdsTicketStatus.PENDING,
        priority: '0',
        queueScore: String(score),
        confirmedAt: event.confirmedAt,
        createdAt: now,
        startedAt: '',
        readyAt: '',
        voidedAt: '',
        archivedAt: '',
        recallUntil: '',
        slaSeconds: String(slaSeconds),
        slaDueAt,
        lastWarningLevel: 'NONE',
        revision: '0',
        sourceEventId: event.eventId,
        correlationId: event.correlationId || '',
        recovered: recovered ? '1' : '0',
        recoveredAt: recovered ? now : '',
        updatedAt: now,
      });
      multi.sadd(orderTicketsKey(event.tenantId, event.orderId), ticketId);
      multi.sadd(sessionTicketsKey(event.tenantId, event.sessionId), ticketId);
      multi.sadd(sourceEventTicketsKey(event.tenantId, event.eventId), ticketId);
      multi.zadd(activeQueueKey(event.tenantId, station), score, ticketId);
      multi.hset(ticketSlaKey(event.tenantId, ticketId), {
        lastWarningLevel: 'NONE',
        warningDueAt: new Date(slaDueAtMs).toISOString(),
        breachDueAt: new Date(breachDueAtMs).toISOString(),
      });
      multi.zadd(globalSlaDueKey(), slaDueAtMs, slaDueMember(event.tenantId, station, ticketId, 'WARNING'));
      multi.zadd(globalSlaDueKey(), breachDueAtMs, slaDueMember(event.tenantId, station, ticketId, 'BREACH'));

      for (const item of items) {
        const ticketItemId = this.ticketItemId(ticketId, item.id);
        multi.sadd(ticketItemsKey(event.tenantId, ticketId), ticketItemId);
        multi.hset(ticketItemKey(event.tenantId, ticketItemId), {
          tenantId: event.tenantId,
          ticketItemId,
          ticketId,
          orderId: event.orderId,
          orderItemId: item.id,
          menuItemId: item.menuItemId,
          menuItemName: item.menuItemName,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
          note: item.note || '',
          station,
          status: KdsTicketItemStatus.PENDING,
          createdAt: now,
          startedAt: '',
          readyAt: '',
          revision: '0',
        });
      }

      await multi.exec();
      const revision = await this.incrementRevisions(event.tenantId, station);
      const queueReason: KdsQueueChangedReason = recovered ? 'SNAPSHOT_REBUILT' : 'TICKET_CREATED';
      events.push(
        this.queueChanged(event.tenantId, station, revision, queueReason, ticketId, event.orderId, event.correlationId),
      );
    }

    return events;
  }

  async startTicket(command: KdsTicketActionTcpRequest): Promise<KdsRepositoryMutationResponse> {
    const idempotent = await this.claimCommand(command.tenantId, command.requestId, command.ticketId);
    const ticket = await this.requireTicket(command.tenantId, command.ticketId, command.station);
    if (!idempotent) {
      return { ticket, revision: ticket.queuePosition, changed: false };
    }
    if (ticket.status !== KdsTicketStatus.PENDING) {
      throw this.conflict();
    }

    const now = new Date().toISOString();
    const itemIds = await this.redis.smembers(ticketItemsKey(command.tenantId, command.ticketId));
    const multi = this.redis.multi();
    multi.hset(ticketKey(command.tenantId, command.ticketId), {
      status: KdsTicketStatus.PROCESSING,
      startedAt: now,
      updatedAt: now,
    });
    for (const itemId of itemIds) {
      multi.hset(ticketItemKey(command.tenantId, itemId), {
        status: KdsTicketItemStatus.PROCESSING,
        startedAt: now,
      });
    }
    await multi.exec();

    const revision = await this.incrementRevisions(command.tenantId, command.station);
    return { ticket: await this.getTicket(command.tenantId, command.ticketId, 0), revision, changed: true };
  }

  async markReady(command: KdsTicketActionTcpRequest): Promise<KdsRepositoryMutationResponse> {
    const idempotent = await this.claimCommand(command.tenantId, command.requestId, command.ticketId);
    const ticket = await this.requireTicket(command.tenantId, command.ticketId, command.station);
    if (!idempotent) {
      return { ticket, revision: ticket.queuePosition, changed: false };
    }
    if (ticket.status !== KdsTicketStatus.PROCESSING) {
      throw this.conflict();
    }

    const readyAt = new Date();
    const recallUntil = new Date(
      readyAt.getTime() + CONFIGURATION.KDS_CONFIG.RECALL_WINDOW_SECONDS * 1000,
    ).toISOString();
    const itemIds = await this.redis.smembers(ticketItemsKey(command.tenantId, command.ticketId));
    const multi = this.redis.multi();
    multi.hset(ticketKey(command.tenantId, command.ticketId), {
      status: KdsTicketStatus.READY,
      readyAt: readyAt.toISOString(),
      recallUntil,
      updatedAt: readyAt.toISOString(),
    });
    multi.zrem(activeQueueKey(command.tenantId, command.station), command.ticketId);
    multi.zrem(globalSlaDueKey(), slaDueMember(command.tenantId, command.station, command.ticketId, 'WARNING'));
    multi.zrem(globalSlaDueKey(), slaDueMember(command.tenantId, command.station, command.ticketId, 'BREACH'));
    multi.zadd(readyQueueKey(command.tenantId, command.station), readyAt.getTime(), command.ticketId);
    for (const itemId of itemIds) {
      multi.hset(ticketItemKey(command.tenantId, itemId), {
        status: KdsTicketItemStatus.READY,
        readyAt: readyAt.toISOString(),
      });
    }
    await multi.exec();

    const revision = await this.incrementRevisions(command.tenantId, command.station);
    return { ticket: await this.getTicket(command.tenantId, command.ticketId, 0), revision, changed: true };
  }

  async recallTicket(command: KdsRecallTicketTcpRequest): Promise<KdsRepositoryMutationResponse> {
    const idempotent = await this.claimCommand(command.tenantId, command.requestId, command.ticketId);
    const ticket = await this.requireTicket(command.tenantId, command.ticketId, command.station);
    if (!idempotent) {
      return { ticket, revision: ticket.queuePosition, changed: false };
    }
    if (ticket.status !== KdsTicketStatus.READY || !ticket.recallUntil || Date.now() > Date.parse(ticket.recallUntil)) {
      throw this.conflict();
    }

    const now = new Date().toISOString();
    const itemIds = await this.redis.smembers(ticketItemsKey(command.tenantId, command.ticketId));
    const slaMeta = await this.redis.hgetall(ticketSlaKey(command.tenantId, command.ticketId));
    const warningMs = Date.parse(slaMeta.warningDueAt || '');
    const breachMs = Date.parse(slaMeta.breachDueAt || '');
    const multi = this.redis.multi();
    multi.hset(ticketKey(command.tenantId, command.ticketId), {
      status: KdsTicketStatus.PROCESSING,
      updatedAt: now,
    });
    multi.zrem(readyQueueKey(command.tenantId, command.station), command.ticketId);
    multi.zadd(activeQueueKey(command.tenantId, command.station), ticket.queueScore, command.ticketId);
    if (Number.isFinite(warningMs)) {
      multi.zadd(
        globalSlaDueKey(),
        warningMs,
        slaDueMember(command.tenantId, command.station, command.ticketId, 'WARNING'),
      );
    }
    if (Number.isFinite(breachMs)) {
      multi.zadd(
        globalSlaDueKey(),
        breachMs,
        slaDueMember(command.tenantId, command.station, command.ticketId, 'BREACH'),
      );
    }
    for (const itemId of itemIds) {
      multi.hset(ticketItemKey(command.tenantId, itemId), {
        status: KdsTicketItemStatus.PROCESSING,
      });
    }
    await multi.exec();

    const revision = await this.incrementRevisions(command.tenantId, command.station);
    return { ticket: await this.getTicket(command.tenantId, command.ticketId, 0), revision, changed: true };
  }

  async setPriority(command: KdsSetPriorityTcpRequest): Promise<KdsRepositoryMutationResponse> {
    const idempotent = await this.claimCommand(command.tenantId, command.requestId, command.ticketId);
    const ticket = await this.requireTicket(command.tenantId, command.ticketId, command.station);
    if (!idempotent) {
      return { ticket, revision: ticket.queuePosition, changed: false };
    }
    if (ticket.status !== KdsTicketStatus.PENDING && ticket.status !== KdsTicketStatus.PROCESSING) {
      throw this.conflict();
    }

    const score = queueScore(command.priority, Date.parse(ticket.confirmedAt));
    const now = new Date().toISOString();
    const multi = this.redis.multi();
    multi.hset(ticketKey(command.tenantId, command.ticketId), {
      priority: command.priority ? '1' : '0',
      queueScore: String(score),
      updatedAt: now,
    });
    multi.zadd(activeQueueKey(command.tenantId, command.station), score, command.ticketId);
    await multi.exec();

    const revision = await this.incrementRevisions(command.tenantId, command.station);
    return { ticket: await this.getTicket(command.tenantId, command.ticketId, 0), revision, changed: true };
  }

  async voidByOrder(command: KdsVoidByOrderTcpRequest): Promise<KdsQueueChangedEvent[]> {
    const ticketIds = await this.redis.smembers(orderTicketsKey(command.tenantId, command.orderId));
    const events: KdsQueueChangedEvent[] = [];

    for (const ticketId of ticketIds) {
      const ticket = await this.getTicket(command.tenantId, ticketId, 0);
      const now = new Date().toISOString();
      const multi = this.redis.multi();
      multi.hset(ticketKey(command.tenantId, ticketId), {
        status: KdsTicketStatus.VOIDED,
        voidedAt: now,
        updatedAt: now,
      });
      multi.zrem(activeQueueKey(command.tenantId, ticket.station), ticketId);
      multi.zrem(readyQueueKey(command.tenantId, ticket.station), ticketId);
      multi.zrem(globalSlaDueKey(), slaDueMember(command.tenantId, ticket.station, ticketId, 'WARNING'));
      multi.zrem(globalSlaDueKey(), slaDueMember(command.tenantId, ticket.station, ticketId, 'BREACH'));
      multi.srem(sessionTicketsKey(command.tenantId, ticket.sessionId), ticketId);
      multi.zadd(
        cleanupDueKey(),
        Date.now() + CONFIGURATION.KDS_CONFIG.ARCHIVED_TTL_SECONDS * 1000,
        `${command.tenantId}|${ticketId}`,
      );
      await multi.exec();

      const revision = await this.incrementRevisions(command.tenantId, ticket.station);
      events.push(
        this.queueChanged(
          command.tenantId,
          ticket.station,
          revision,
          'TICKET_VOIDED',
          ticketId,
          command.orderId,
          command.correlationId,
        ),
      );
    }

    return events;
  }

  async patchTableSnapshot(command: KdsPatchTableSnapshotTcpRequest): Promise<KdsQueueChangedEvent[]> {
    const ticketIds = await this.redis.smembers(sessionTicketsKey(command.tenantId, command.sessionId));
    if (!ticketIds.length) {
      const visible = await this.collectVisibleTicketIds(command.tenantId);
      for (const ticketId of visible) {
        const ticket = await this.getTicket(command.tenantId, ticketId, 0);
        if (ticket.sessionId === command.sessionId) {
          ticketIds.push(ticketId);
        }
      }
    }

    const events: KdsQueueChangedEvent[] = [];

    for (const ticketId of ticketIds) {
      const ticket = await this.getTicket(command.tenantId, ticketId, 0);
      if (ticket.sessionId !== command.sessionId) {
        continue;
      }
      await this.redis.hset(ticketKey(command.tenantId, ticketId), {
        tableId: command.tableId,
        tableName: command.tableName,
        updatedAt: new Date().toISOString(),
      });
      const revision = await this.incrementRevisions(command.tenantId, ticket.station);
      events.push(
        this.queueChanged(
          command.tenantId,
          ticket.station,
          revision,
          'TABLE_SNAPSHOT_PATCHED',
          ticketId,
          ticket.orderId,
          command.correlationId,
        ),
      );
    }

    return events;
  }

  async getStationRevision(tenantId: string, station: PreparationStation): Promise<number> {
    return Number((await this.redis.get(revisionKey(tenantId, station))) || 0);
  }

  async claimDueSla(nowMs: number, limit: number): Promise<string[]> {
    return this.redis.zrangebyscore(globalSlaDueKey(), '-inf', nowMs, 'LIMIT', 0, limit);
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

        const created = await this.createTicketsFromConfirmedOrder(synthetic, { recovered: true });
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

  private async partitionValidItems(
    event: OrderConfirmedEvent,
  ): Promise<Map<PreparationStation, OrderConfirmedEventItem[]>> {
    const validItems = new Map<PreparationStation, OrderConfirmedEventItem[]>();
    for (const item of event.items) {
      if (!item.station) {
        await this.writeDeadLetter(event, item);
        continue;
      }
      if (item.status === 'CANCELED') {
        continue;
      }
      const stationItems = validItems.get(item.station) || [];
      stationItems.push(item);
      validItems.set(item.station, stationItems);
    }
    return validItems;
  }

  private async writeDeadLetter(event: OrderConfirmedEvent, item: OrderConfirmedEventItem): Promise<void> {
    const key = deadLetterOrderConfirmedKey(event.tenantId);
    await this.redis.rpush(key, JSON.stringify({ eventId: event.eventId, orderId: event.orderId, item }));
    await this.redis.ltrim(key, -1000, -1);
    await this.redis.expire(key, DEAD_LETTER_TTL_SECONDS);
  }

  private async collectVisibleTicketIds(tenantId: string): Promise<string[]> {
    const stations: PreparationStation[] = ['KITCHEN', 'BAR'];
    const ids = new Set<string>();
    for (const station of stations) {
      for (const id of await this.redis.zrange(activeQueueKey(tenantId, station), 0, -1)) ids.add(id);
      for (const id of await this.redis.zrange(readyQueueKey(tenantId, station), 0, -1)) ids.add(id);
    }
    return [...ids];
  }

  private async getTicketsByIds(tenantId: string, ids: string[]): Promise<KdsTicketDto[]> {
    const tickets: KdsTicketDto[] = [];
    for (const [index, id] of ids.entries()) {
      tickets.push(await this.getTicket(tenantId, id, index + 1));
    }
    return tickets;
  }

  private async requireTicket(tenantId: string, ticketId: string, station: PreparationStation): Promise<KdsTicketDto> {
    const ticket = await this.getTicket(tenantId, ticketId, 0);
    if (ticket.tenantId !== tenantId || ticket.station !== station) {
      throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED, HttpStatus.NOT_FOUND);
    }
    return ticket;
  }

  private async getTicket(tenantId: string, ticketId: string, queuePosition: number): Promise<KdsTicketDto> {
    const hash = await this.redis.hgetall(ticketKey(tenantId, ticketId));
    if (!hash?.ticketId) {
      throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED, HttpStatus.NOT_FOUND);
    }

    const itemIds = await this.redis.smembers(ticketItemsKey(tenantId, ticketId));
    const items: KdsTicketItemDto[] = [];
    for (const itemId of itemIds) {
      const itemHash = await this.redis.hgetall(ticketItemKey(tenantId, itemId));
      if (itemHash?.ticketItemId) {
        items.push(this.toItemDto(itemHash));
      }
    }

    return this.toTicketDto(hash, items, queuePosition);
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

  private async claimCommand(tenantId: string, requestId: string, ticketId: string): Promise<boolean> {
    const result = await this.redis.set(
      commandDedupeKey(tenantId, requestId),
      ticketId,
      'EX',
      COMMAND_TTL_SECONDS,
      'NX',
    );
    return result === 'OK';
  }

  private async incrementRevisions(tenantId: string, station: PreparationStation): Promise<number> {
    await this.redis.incr(`kds:${tenantId}:revision`);
    return this.redis.incr(revisionKey(tenantId, station));
  }

  private queueChanged(
    tenantId: string,
    station: PreparationStation,
    revision: number,
    reason: KdsQueueChangedReason,
    ticketId?: string,
    orderId?: string,
    correlationId?: string,
  ): KdsQueueChangedEvent {
    return {
      eventId: randomUUID(),
      eventType: 'kds.queue_changed',
      schemaVersion: 1,
      tenantId,
      station,
      revision,
      reason,
      ticketId,
      orderId,
      occurredAt: new Date().toISOString(),
      correlationId,
    };
  }

  private ticketId(orderId: string, station: PreparationStation): string {
    return `${orderId}:${station}`;
  }

  private ticketItemId(ticketId: string, orderItemId: string): string {
    return `${ticketId}:${orderItemId}`;
  }

  private conflict(): BusinessException {
    return new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED, HttpStatus.CONFLICT);
  }
}
