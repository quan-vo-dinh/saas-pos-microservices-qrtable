import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { PaymentEntity } from '../entities/payment.entity';

@Injectable()
export class PaymentRepository {
  constructor(@InjectRepository(PaymentEntity) private readonly repo: Repository<PaymentEntity>) {}

  create(input: Partial<PaymentEntity>): PaymentEntity {
    return this.repo.create(input);
  }

  save(entity: PaymentEntity, manager?: EntityManager): Promise<PaymentEntity> {
    return manager ? manager.save(PaymentEntity, entity) : this.repo.save(entity);
  }

  findByTenantAndBill(tenantId: string, billId: string): Promise<PaymentEntity | null> {
    return this.repo.findOne({ where: { tenantId, billId } });
  }

  findByTenantAndId(tenantId: string, id: string): Promise<PaymentEntity | null> {
    return this.repo.findOne({ where: { tenantId, id } });
  }

  findByBillReferenceForUpdate(manager: EntityManager, billReference: string): Promise<PaymentEntity | null> {
    return manager
      .createQueryBuilder(PaymentEntity, 'payment')
      .setLock('pessimistic_write')
      .where('payment.billReference = :billReference', { billReference })
      .getOne();
  }

  findByTenantBillForUpdate(manager: EntityManager, tenantId: string, billId: string): Promise<PaymentEntity | null> {
    return manager
      .createQueryBuilder(PaymentEntity, 'payment')
      .setLock('pessimistic_write')
      .where('payment.tenantId = :tenantId', { tenantId })
      .andWhere('payment.billId = :billId', { billId })
      .getOne();
  }

  findByTenantAndIdForUpdate(
    manager: EntityManager,
    tenantId: string,
    paymentId: string,
  ): Promise<PaymentEntity | null> {
    return manager
      .createQueryBuilder(PaymentEntity, 'payment')
      .setLock('pessimistic_write')
      .where('payment.tenantId = :tenantId', { tenantId })
      .andWhere('payment.id = :paymentId', { paymentId })
      .getOne();
  }

  async findByTenantOrdered(
    tenantId: string,
    opts: { billId?: string; status?: string; limit?: number; offset?: number },
  ): Promise<PaymentEntity[]> {
    const limit = Math.min(opts.limit ?? 50, 200);
    const offset = opts.offset ?? 0;
    const qb = this.repo
      .createQueryBuilder('payment')
      .where('payment.tenantId = :tenantId', { tenantId })
      .orderBy('payment.createdAt', 'DESC')
      .take(limit)
      .skip(offset);
    if (opts.billId) {
      qb.andWhere('payment.billId = :billId', { billId: opts.billId });
    }
    if (opts.status) {
      qb.andWhere('payment.status = :status', { status: opts.status });
    }
    return qb.getMany();
  }
}
