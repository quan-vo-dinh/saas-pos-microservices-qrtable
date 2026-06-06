import { BaseEntity } from './base.entity';
import { Column, Entity, Index } from 'typeorm';
import type { ServiceRequestStatus, ServiceRequestType } from '@einvoice/types';

@Entity({ name: 'service_requests' })
@Index(['tenantId', 'sessionId'])
export class ServiceRequest extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar', length: 64 })
  tenantId: string;

  @Column({ name: 'table_id', type: 'uuid' })
  tableId: string;

  @Column({ name: 'table_name', type: 'varchar', length: 255 })
  tableName: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @Column({ type: 'varchar', length: 32 })
  type: ServiceRequestType;

  @Column({ type: 'varchar', length: 20 })
  status: ServiceRequestStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  @Column({ name: 'acknowledged_at', type: 'timestamp', nullable: true })
  acknowledgedAt: Date | null;

  @Column({ name: 'acknowledged_by_user_id', type: 'varchar', length: 64, nullable: true })
  acknowledgedByUserId: string | null;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;
}
