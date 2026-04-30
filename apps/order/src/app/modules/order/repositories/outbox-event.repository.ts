import { OutboxEvent } from '@common/entities/outbox-event.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class OutboxEventRepository {
  constructor(@InjectRepository(OutboxEvent) private readonly repo: Repository<OutboxEvent>) {}

  findByIdAndTenant(id: string, tenantId: string): Promise<OutboxEvent | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }
}
