import type {
  KdsGetQueueTcpRequest,
  KdsMutationTcpResponse,
  KdsPatchTableSnapshotTcpRequest,
  KdsRecallTicketTcpRequest,
  KdsSetPriorityTcpRequest,
  KdsTicketActionTcpRequest,
  KdsVoidByOrderTcpRequest,
} from '@common/interfaces/tcp/kitchen';
import { Injectable } from '@nestjs/common';
import type { KdsQueueChangedEvent, KdsQueueChangedReason, KdsQueueSnapshot } from '@einvoice/types';
import { randomUUID } from 'crypto';
import { KdsRedisRepository } from '../repositories/kds-redis.repository';
import { KitchenEventsPublisher } from './kitchen-events.publisher';

@Injectable()
export class KdsTicketService {
  constructor(
    private readonly repository: KdsRedisRepository,
    private readonly eventsPublisher: KitchenEventsPublisher,
  ) {}

  async getQueue(request: KdsGetQueueTcpRequest): Promise<KdsQueueSnapshot> {
    return this.repository.getQueueSnapshot(request.tenantId, request.station);
  }

  async startTicket(request: KdsTicketActionTcpRequest): Promise<KdsMutationTcpResponse> {
    return this.mutateTicket(request, 'TICKET_STARTED', () => this.repository.startTicket(request));
  }

  async markReady(request: KdsTicketActionTcpRequest): Promise<KdsMutationTcpResponse> {
    return this.mutateTicket(request, 'TICKET_READY', () => this.repository.markReady(request));
  }

  async recallTicket(request: KdsRecallTicketTcpRequest): Promise<KdsMutationTcpResponse> {
    return this.mutateTicket(request, 'TICKET_RECALLED', () => this.repository.recallTicket(request));
  }

  async setPriority(request: KdsSetPriorityTcpRequest): Promise<KdsMutationTcpResponse> {
    return this.mutateTicket(request, 'PRIORITY_CHANGED', () => this.repository.setPriority(request));
  }

  async voidByOrder(request: KdsVoidByOrderTcpRequest): Promise<void> {
    await this.eventsPublisher.publishMany(await this.repository.voidByOrder(request));
  }

  async patchTableSnapshot(request: KdsPatchTableSnapshotTcpRequest): Promise<void> {
    await this.eventsPublisher.publishMany(await this.repository.patchTableSnapshot(request));
  }

  private async mutateTicket(
    request: KdsTicketActionTcpRequest,
    reason: KdsQueueChangedReason,
    mutation: () => Promise<KdsMutationTcpResponse>,
  ): Promise<KdsMutationTcpResponse> {
    const mutationResult = (await mutation()) as KdsMutationTcpResponse & { changed?: boolean };
    const { changed, ...result } = mutationResult;
    if (changed !== false) {
      await this.eventsPublisher.publish(this.queueChanged(request, result, reason));
    }
    return result;
  }

  private queueChanged(
    request: KdsTicketActionTcpRequest,
    result: KdsMutationTcpResponse,
    reason: KdsQueueChangedReason,
  ): KdsQueueChangedEvent {
    return {
      eventId: randomUUID(),
      eventType: 'kds.queue_changed',
      schemaVersion: 1,
      tenantId: request.tenantId,
      station: request.station,
      revision: result.revision,
      reason,
      ticketId: request.ticketId,
      orderId: result.ticket.orderId,
      occurredAt: new Date().toISOString(),
      correlationId: request.correlationId,
    };
  }
}
