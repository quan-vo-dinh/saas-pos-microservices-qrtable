import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('outbox_events')
@Index('ix_outbox_status_created', ['status', 'createdAt'])
export class SaasOutboxEvent extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar', length: 64 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 120 })
  topic!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 120 })
  eventType!: string;

  @Column({ name: 'aggregate_id', type: 'uuid' })
  aggregateId!: string;

  @Column({ name: 'partition_key', type: 'varchar', length: 128 })
  partitionKey!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status!: 'PENDING' | 'PUBLISHED' | 'FAILED';

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt?: Date | null;

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount!: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string | null;
}
