import { OutboxEvent } from '@common/entities/outbox-event.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

const MAX_SEND_ATTEMPTS = 10;

@Injectable()
export class OutboxEventRepository {
  constructor(@InjectRepository(OutboxEvent) private readonly repo: Repository<OutboxEvent>) {}

  findByIdAndTenant(id: string, tenantId: string): Promise<OutboxEvent | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  findPendingRows(take: number): Promise<OutboxEvent[]> {
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
}
