import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { CONFIGURATION } from '../../../../configuration';
import { PaymentOutboxEventEntity } from '../entities/payment-outbox-event.entity';
import { PaymentEntity } from '../entities/payment.entity';
import { RefundEntity } from '../entities/refund.entity';
import { buildPaymentCompletedPayload, buildPaymentRefundedPayload } from '../services/payment-event-builder';

const MAX_SEND_ATTEMPTS = 10;

@Injectable()
export class PaymentOutboxRepository {
  constructor(
    @InjectRepository(PaymentOutboxEventEntity) private readonly repo: Repository<PaymentOutboxEventEntity>,
  ) {}

  // Phase 3 demo assumes a single Payment instance. Multi-instance deployment must replace
  // this read with a DB claim/lock step such as FOR UPDATE SKIP LOCKED or PROCESSING rows.
  findPendingRows(take: number): Promise<PaymentOutboxEventEntity[]> {
    return this.repo.find({
      where: { status: 'PENDING' },
      order: { createdAt: 'ASC' },
      take,
    });
  }

  async markPublished(id: string, tenantId: string): Promise<void> {
    await this.repo.update(
      { id, tenantId },
      {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        lastError: null,
      },
    );
  }

  async recordSendFailure(id: string, tenantId: string, message: string): Promise<void> {
    const row = await this.repo.findOne({ where: { id, tenantId } });
    if (!row) {
      return;
    }
    const next = (row.attemptCount ?? 0) + 1;
    const truncated = message.slice(0, 4000);
    await this.repo.update(
      { id, tenantId },
      {
        attemptCount: next,
        lastError: truncated,
        status: next >= MAX_SEND_ATTEMPTS ? 'FAILED' : 'PENDING',
      },
    );
  }

  async createCompleted(manager: EntityManager, payment: PaymentEntity, correlationId?: string): Promise<void> {
    const eventId = randomUUID();
    const payload = buildPaymentCompletedPayload(payment, eventId, correlationId);
    const row = manager.create(PaymentOutboxEventEntity, {
      tenantId: payment.tenantId,
      topic: CONFIGURATION.KAFKA_CONFIG.PAYMENT_COMPLETED_TOPIC,
      eventType: 'payment.completed',
      aggregateId: payment.id,
      partitionKey: payment.tenantId,
      payload,
      status: 'PENDING',
    });
    await manager.save(PaymentOutboxEventEntity, row);
  }

  async createRefunded(
    manager: EntityManager,
    payment: PaymentEntity,
    refund: RefundEntity,
    correlationId?: string,
  ): Promise<void> {
    const eventId = randomUUID();
    const payload = buildPaymentRefundedPayload(payment, refund, eventId, correlationId);
    const row = manager.create(PaymentOutboxEventEntity, {
      tenantId: payment.tenantId,
      topic: CONFIGURATION.KAFKA_CONFIG.PAYMENT_REFUNDED_TOPIC,
      eventType: 'payment.refunded',
      aggregateId: payment.id,
      partitionKey: payment.tenantId,
      payload,
      status: 'PENDING',
    });
    await manager.save(PaymentOutboxEventEntity, row);
  }
}
