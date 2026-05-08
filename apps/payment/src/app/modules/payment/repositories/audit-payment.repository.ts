import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditPaymentAction, AuditActorType, AuditPaymentEntity } from '../entities/audit-payment.entity';
import { PaymentEntity } from '../entities/payment.entity';
import { RefundEntity } from '../entities/refund.entity';

@Injectable()
export class AuditPaymentRepository {
  constructor(@InjectRepository(AuditPaymentEntity) private readonly repo: Repository<AuditPaymentEntity>) {}

  async createPaymentAudit(
    payment: PaymentEntity,
    action: AuditPaymentAction,
    actorType: AuditActorType,
    actorId: string | null,
    reason: string | null,
    meta: Record<string, unknown> | null,
    manager?: EntityManager,
  ): Promise<void> {
    const row = this.repo.create({
      tenantId: payment.tenantId,
      paymentId: payment.id,
      refundId: null,
      action,
      actorType,
      actorId,
      reason,
      meta,
    });
    if (manager) {
      await manager.save(AuditPaymentEntity, row);
    } else {
      await this.repo.save(row);
    }
  }

  async createRefundAudit(
    refund: RefundEntity,
    payment: PaymentEntity,
    action: AuditPaymentAction,
    actorId: string | null,
    reason: string | null,
    manager?: EntityManager,
  ): Promise<void> {
    const row = this.repo.create({
      tenantId: payment.tenantId,
      paymentId: payment.id,
      refundId: refund.id,
      action,
      actorType: 'USER',
      actorId,
      reason,
      meta: null,
    });
    if (manager) {
      await manager.save(AuditPaymentEntity, row);
    } else {
      await this.repo.save(row);
    }
  }
}
