import type {
  KdsMutationTcpResponse,
  KdsPatchTableSnapshotTcpRequest,
  KdsRecallTicketTcpRequest,
  KdsSetPriorityTcpRequest,
  KdsTicketActionTcpRequest,
  KdsVoidByOrderTcpRequest,
} from '@common/interfaces/tcp/kitchen';
import { RedisClientService } from '@common/providers/redis-client/redis-client.service';
import { Inject, Injectable, InternalServerErrorException, Optional } from '@nestjs/common';
import type {
  KdsActiveOrderSnapshot,
  KdsQueueChangedEvent,
  KdsQueueSnapshot,
  KdsTicketDto,
  KdsWarningLevel,
  OrderConfirmedEvent,
  PreparationStation,
} from '@einvoice/types';
import { KdsRecoveryStoreRepository } from './kds-recovery-store.repository';
import { KdsSlaStoreRepository } from './kds-sla-store.repository';
import { KdsTicketStoreRepository } from './kds-ticket-store.repository';

type KdsRepositoryMutationResponse = KdsMutationTcpResponse & { changed?: boolean };

@Injectable()
export class KdsRedisRepository {
  private readonly ticketStore: KdsTicketStoreRepository;
  private readonly slaStore: KdsSlaStoreRepository;
  private readonly recoveryStore: KdsRecoveryStoreRepository;

  constructor(
    @Inject(KdsTicketStoreRepository)
    ticketStoreOrRedis: KdsTicketStoreRepository | RedisClientService,
    @Optional()
    @Inject(KdsSlaStoreRepository)
    slaStore?: KdsSlaStoreRepository,
    @Optional()
    @Inject(KdsRecoveryStoreRepository)
    recoveryStore?: KdsRecoveryStoreRepository,
  ) {
    if (KdsRedisRepository.isRedisClientService(ticketStoreOrRedis)) {
      this.ticketStore = new KdsTicketStoreRepository(ticketStoreOrRedis);
      this.slaStore = new KdsSlaStoreRepository(ticketStoreOrRedis);
      this.recoveryStore = new KdsRecoveryStoreRepository(ticketStoreOrRedis, this.ticketStore);
      return;
    }

    if (!slaStore || !recoveryStore) {
      throw new InternalServerErrorException('KdsRedisRepository requires ticket, SLA, and recovery stores');
    }

    this.ticketStore = ticketStoreOrRedis;
    this.slaStore = slaStore;
    this.recoveryStore = recoveryStore;
  }

  async getQueueSnapshot(tenantId: string, station: PreparationStation): Promise<KdsQueueSnapshot> {
    return this.ticketStore.getQueueSnapshot(tenantId, station);
  }

  async createTicketsFromConfirmedOrder(
    event: OrderConfirmedEvent,
    options?: { recovered?: boolean },
  ): Promise<KdsQueueChangedEvent[]> {
    return this.ticketStore.createTicketsFromConfirmedOrder(event, options);
  }

  async startTicket(command: KdsTicketActionTcpRequest): Promise<KdsRepositoryMutationResponse> {
    return this.ticketStore.startTicket(command);
  }

  async markReady(command: KdsTicketActionTcpRequest): Promise<KdsRepositoryMutationResponse> {
    return this.ticketStore.markReady(command);
  }

  async recallTicket(command: KdsRecallTicketTcpRequest): Promise<KdsRepositoryMutationResponse> {
    return this.ticketStore.recallTicket(command);
  }

  async setPriority(command: KdsSetPriorityTcpRequest): Promise<KdsRepositoryMutationResponse> {
    return this.ticketStore.setPriority(command);
  }

  async voidByOrder(command: KdsVoidByOrderTcpRequest): Promise<KdsQueueChangedEvent[]> {
    return this.ticketStore.voidByOrder(command);
  }

  async patchTableSnapshot(command: KdsPatchTableSnapshotTcpRequest): Promise<KdsQueueChangedEvent[]> {
    return this.ticketStore.patchTableSnapshot(command);
  }

  async getStationRevision(tenantId: string, station: PreparationStation): Promise<number> {
    return this.ticketStore.getStationRevision(tenantId, station);
  }

  async claimDueSla(nowMs: number, limit: number): Promise<string[]> {
    return this.slaStore.claimDueSla(nowMs, limit);
  }

  async acquireSlaClaim(member: string): Promise<boolean> {
    return this.slaStore.acquireSlaClaim(member);
  }

  async releaseSlaClaim(member: string): Promise<void> {
    return this.slaStore.releaseSlaClaim(member);
  }

  async trySetSlaDedupe(
    tenantId: string,
    ticketId: string,
    level: 'WARNING' | 'BREACH',
    bucket: string,
  ): Promise<boolean> {
    return this.slaStore.trySetSlaDedupe(tenantId, ticketId, level, bucket);
  }

  async removeSlaDueMember(member: string): Promise<void> {
    return this.slaStore.removeSlaDueMember(member);
  }

  async updateTicketLastWarningLevel(tenantId: string, ticketId: string, level: KdsWarningLevel): Promise<void> {
    return this.slaStore.updateTicketLastWarningLevel(tenantId, ticketId, level);
  }

  async findTicketForSla(tenantId: string, ticketId: string): Promise<KdsTicketDto | null> {
    return this.slaStore.findTicketForSla(tenantId, ticketId);
  }

  async rebuildMissingTicketsFromSnapshots(
    snapshots: KdsActiveOrderSnapshot[],
    stationFilter?: PreparationStation,
  ): Promise<{ events: KdsQueueChangedEvent[]; rebuiltCount: number }> {
    return this.recoveryStore.rebuildMissingTicketsFromSnapshots(snapshots, stationFilter);
  }

  async tryAcquireRebuildLock(tenantId: string, token: string, ttlSeconds = 120): Promise<boolean> {
    return this.recoveryStore.tryAcquireRebuildLock(tenantId, token, ttlSeconds);
  }

  async releaseRebuildLockIfHeld(tenantId: string, token: string): Promise<void> {
    await this.recoveryStore.releaseRebuildLockIfHeld(tenantId, token);
  }

  private static isRedisClientService(
    candidate: KdsTicketStoreRepository | RedisClientService,
  ): candidate is RedisClientService {
    return 'getClient' in candidate && typeof candidate.getClient === 'function';
  }
}
