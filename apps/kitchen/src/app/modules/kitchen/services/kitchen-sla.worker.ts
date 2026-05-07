import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { KitchenSlaWarningEvent, KdsQueueChangedEvent, PreparationStation } from '@einvoice/types';
import { randomUUID } from 'crypto';
import { CONFIGURATION } from '../../../../configuration';
import { KdsRedisRepository } from '../repositories/kds-redis.repository';
import { KitchenEventsPublisher } from './kitchen-events.publisher';
import { KitchenKafkaProducer } from './kitchen-kafka.producer';

const SLA_SCAN_LIMIT = 100;

export function slaDayBucketUtc(nowMs: number): string {
  return String(Math.floor(nowMs / 86400000));
}

export function parseGlobalSlaDueMember(member: string): {
  tenantId: string;
  station: PreparationStation;
  ticketId: string;
  level: 'WARNING' | 'BREACH';
} | null {
  const parts = member.split('|');
  if (parts.length !== 4) {
    return null;
  }
  const [tenantId, station, ticketId, levelRaw] = parts;
  if (levelRaw !== 'WARNING' && levelRaw !== 'BREACH') {
    return null;
  }
  if (station !== 'KITCHEN' && station !== 'BAR') {
    return null;
  }
  return {
    tenantId,
    station: station as PreparationStation,
    ticketId,
    level: levelRaw,
  };
}

@Injectable()
export class KitchenSlaWorker implements OnModuleDestroy, OnModuleInit {
  private readonly logger = new Logger(KitchenSlaWorker.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly repository: KdsRedisRepository,
    private readonly kafkaProducer: KitchenKafkaProducer,
    private readonly eventsPublisher: KitchenEventsPublisher,
  ) {}

  onModuleInit(): void {
    const intervalMs = CONFIGURATION.KDS_CONFIG.SLA_WORKER_INTERVAL_MS;
    this.timer = setInterval(() => void this.runTickSafe(), intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runTickSafe(): Promise<void> {
    try {
      await this.runTick();
    } catch (e) {
      this.logger.warn(`SLA worker tick failed: ${(e as Error).message}`);
    }
  }

  async runTick(nowMs: number = Date.now()): Promise<void> {
    const due = await this.repository.claimDueSla(nowMs, SLA_SCAN_LIMIT);
    for (const member of due) {
      await this.processDueMember(member, nowMs);
    }
  }

  private async processDueMember(member: string, nowMs: number): Promise<void> {
    const parsed = parseGlobalSlaDueMember(member);
    if (!parsed) {
      await this.repository.removeSlaDueMember(member);
      return;
    }

    const claimed = await this.repository.acquireSlaClaim(member);
    if (!claimed) {
      return;
    }

    try {
      const ticket = await this.repository.findTicketForSla(parsed.tenantId, parsed.ticketId);
      if (!ticket) {
        await this.repository.removeSlaDueMember(member);
        return;
      }

      if (ticket.status === 'READY' || ticket.status === 'VOIDED' || ticket.status === 'ARCHIVED') {
        await this.repository.removeSlaDueMember(member);
        return;
      }

      const bucket = slaDayBucketUtc(nowMs);
      const dedupeFresh = await this.repository.trySetSlaDedupe(parsed.tenantId, parsed.ticketId, parsed.level, bucket);
      if (!dedupeFresh) {
        await this.repository.removeSlaDueMember(member);
        return;
      }

      const breachGrace = CONFIGURATION.KDS_CONFIG.BREACH_GRACE_SECONDS;
      const thresholdSeconds = parsed.level === 'WARNING' ? ticket.slaSeconds : ticket.slaSeconds + breachGrace;
      const confirmedAtMs = Date.parse(ticket.confirmedAt);
      const waitTimeSeconds = Number.isFinite(confirmedAtMs)
        ? Math.max(0, Math.floor((nowMs - confirmedAtMs) / 1000))
        : 0;

      const warningLevel = parsed.level === 'WARNING' ? ('WARNING' as const) : ('BREACH' as const);

      const kafkaEvent: KitchenSlaWarningEvent = {
        eventId: randomUUID(),
        eventType: 'kitchen.sla_warning',
        schemaVersion: 1,
        tenantId: parsed.tenantId,
        ticketId: parsed.ticketId,
        orderId: ticket.orderId,
        sessionId: ticket.sessionId,
        tableId: ticket.tableId,
        tableName: ticket.tableName,
        station: parsed.station,
        level: warningLevel,
        waitTimeSeconds,
        thresholdSeconds,
        occurredAt: new Date(nowMs).toISOString(),
      };

      const published = await this.kafkaProducer.publishSlaWarning(kafkaEvent);
      if (!published) {
        return;
      }

      await this.repository.updateTicketLastWarningLevel(
        parsed.tenantId,
        parsed.ticketId,
        parsed.level === 'WARNING' ? 'WARNING' : 'BREACH',
      );

      const revision = await this.repository.getStationRevision(parsed.tenantId, parsed.station);

      const internal: KdsQueueChangedEvent = {
        eventId: randomUUID(),
        eventType: 'kds.queue_changed',
        schemaVersion: 1,
        tenantId: parsed.tenantId,
        station: parsed.station,
        revision,
        reason: 'SLA_CHANGED',
        ticketId: parsed.ticketId,
        orderId: ticket.orderId,
        occurredAt: new Date(nowMs).toISOString(),
      };
      await this.eventsPublisher.publish(internal);

      await this.repository.removeSlaDueMember(member);
    } finally {
      await this.repository.releaseSlaClaim(member);
    }
  }
}
