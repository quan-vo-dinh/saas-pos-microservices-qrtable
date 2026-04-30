import { Session } from '@common/entities/session.entity';
import { SessionStatus } from '@einvoice/types';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class SessionRepository {
  constructor(@InjectRepository(Session) private readonly repo: Repository<Session>) {}

  findByIdAndTenant(id: string, tenantId: string): Promise<Session | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  findActiveByIdAndTenant(id: string, tenantId: string): Promise<Session | null> {
    return this.repo.findOne({ where: { id, tenantId, status: SessionStatus.ACTIVE } });
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
}
