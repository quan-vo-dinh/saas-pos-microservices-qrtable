import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { RefundEntity } from '../entities/refund.entity';

@Injectable()
export class RefundRepository {
  constructor(@InjectRepository(RefundEntity) private readonly repo: Repository<RefundEntity>) {}

  findByTenantAndId(tenantId: string, id: string): Promise<RefundEntity | null> {
    return this.repo.findOne({ where: { tenantId, id } });
  }

  findByTenantAndIdForUpdate(manager: EntityManager, tenantId: string, refundId: string): Promise<RefundEntity | null> {
    return manager
      .createQueryBuilder(RefundEntity, 'refund')
      .setLock('pessimistic_write')
      .where('refund.tenantId = :tenantId', { tenantId })
      .andWhere('refund.id = :refundId', { refundId })
      .getOne();
  }

  findBlockingRefundForPayment(manager: EntityManager, paymentId: string): Promise<RefundEntity | null> {
    return manager
      .createQueryBuilder(RefundEntity, 'refund')
      .where('refund.paymentId = :paymentId', { paymentId })
      .andWhere('refund.status IN (:...statuses)', {
        statuses: ['PENDING_STAFF_ACTION', 'CONFIRMED'],
      })
      .getOne();
  }
}
