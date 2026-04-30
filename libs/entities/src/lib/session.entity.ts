import { BaseEntity } from './base.entity';
import { Column, Entity, Index } from 'typeorm';
import { SessionStatus } from '@einvoice/types';

@Entity({ name: 'sessions' })
@Index(['tenantId', 'tableId', 'status'])
export class Session extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar', length: 64 })
  tenantId: string;

  @Column({ name: 'table_id', type: 'uuid' })
  tableId: string;

  @Column({ name: 'table_name', type: 'varchar', length: 255 })
  tableName: string;

  @Column({ type: 'varchar', length: 20 })
  status: SessionStatus;

  @Column({ name: 'started_at', type: 'timestamp' })
  startedAt: Date;

  @Column({ name: 'last_activity', type: 'timestamp' })
  lastActivity: Date;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date | null;

  @Column({ name: 'order_count', type: 'int', default: 0 })
  orderCount: number;

  @Column({ name: 'current_bill_id', type: 'uuid', nullable: true })
  currentBillId: string | null;

  @Column({ type: 'int', default: 1 })
  version: number;
}
