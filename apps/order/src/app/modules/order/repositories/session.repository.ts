import { Session } from '@common/entities/session.entity';
import { SessionStatus } from '@einvoice/types';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, LessThanOrEqual, Repository } from 'typeorm';

@Injectable()
export class SessionRepository {
  constructor(@InjectRepository(Session) private readonly repo: Repository<Session>) {}

  findByIdAndTenant(id: string, tenantId: string): Promise<Session | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  findActiveByIdAndTenant(id: string, tenantId: string): Promise<Session | null> {
    return this.repo.findOne({ where: { id, tenantId, status: SessionStatus.ACTIVE } });
  }

  findByIdAndTenantForUpdate(id: string, tenantId: string, manager: EntityManager): Promise<Session | null> {
    return manager
      .getRepository(Session)
      .createQueryBuilder('s')
      .setLock('pessimistic_write')
      .where('s.id = :id', { id })
      .andWhere('s.tenantId = :tenantId', { tenantId })
      .getOne();
  }

  async updateTableSnapshot(id: string, tenantId: string, tableId: string, tableName: string): Promise<void> {
    await this.repo.update({ id, tenantId }, { tableId, tableName, lastActivity: new Date() });
  }

  async updateLastActivity(id: string, tenantId: string, at: Date): Promise<void> {
    await this.repo.update({ id, tenantId }, { lastActivity: at });
  }

  async markClosed(id: string, tenantId: string, closedAt: Date): Promise<void> {
    await this.repo.update(
      { id, tenantId },
      {
        status: SessionStatus.CLOSED,
        closedAt,
      },
    );
  }

  async markActiveClosedIfEmpty(id: string, tenantId: string, closedAt: Date): Promise<boolean> {
    const result = await this.repo.update(
      {
        id,
        tenantId,
        status: SessionStatus.ACTIVE,
        orderCount: 0,
        currentBillId: IsNull(),
      },
      {
        status: SessionStatus.CLOSED,
        closedAt,
      },
    );
    return (result.affected ?? 0) > 0;
  }

  async markIdleClosedIfEmptyAndStale(
    id: string,
    tenantId: string,
    staleBefore: Date,
    closedAt: Date,
  ): Promise<boolean> {
    const result = await this.repo.update(
      {
        id,
        tenantId,
        status: SessionStatus.ACTIVE,
        orderCount: 0,
        lastActivity: LessThanOrEqual(staleBefore),
      },
      {
        status: SessionStatus.CLOSED,
        closedAt,
      },
    );
    return (result.affected ?? 0) > 0;
  }

  save(entity: Session): Promise<Session> {
    return this.repo.save(entity);
  }
}
