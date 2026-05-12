import { SaasOutboxEvent } from '@common/entities/saas-outbox-event.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';

const MAX_SEND_ATTEMPTS = 10;
const TENANT_CREATED_TOPIC = process.env['KAFKA_TENANT_CREATED_TOPIC'] || 'tenant.created';

@Injectable()
export class SaasOutboxRepository {
  constructor(@InjectRepository(SaasOutboxEvent) private readonly repo: Repository<SaasOutboxEvent>) {}

  findPendingRows(take: number): Promise<SaasOutboxEvent[]> {
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
    await this.repo.update(
      { id, tenantId },
      {
        attemptCount: next,
        lastError: message.slice(0, 4000),
        status: next >= MAX_SEND_ATTEMPTS ? 'FAILED' : 'PENDING',
      },
    );
  }

  async createTenantCreated(input: Record<string, unknown>): Promise<void> {
    const tenantId = String(input.tenantId);
    const eventId = randomUUID();
    const payload = {
      eventId,
      eventType: 'tenant.created',
      occurredAt: new Date().toISOString(),
      tenantId,
      slug: input.slug,
      name: input.name,
      type: input.type ?? 'RESTAURANT',
      ownerUserId: input.ownerUserId,
      ownerEmail: input.ownerEmail,
      ownerFirstName: input.ownerFirstName,
      ownerLastName: input.ownerLastName,
      planCode: input.planCode,
      defaultCurrency: 'VND',
      defaultLocale: 'vi-VN',
      correlationId: input.processId,
    };
    const row = this.repo.create({
      tenantId,
      topic: TENANT_CREATED_TOPIC,
      eventType: 'tenant.created',
      aggregateId: tenantId,
      partitionKey: tenantId,
      payload,
      status: 'PENDING',
    });
    await this.repo.save(row);
  }
}
