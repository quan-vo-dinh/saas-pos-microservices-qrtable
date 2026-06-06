import { BaseEntity } from './base.entity';
import { Column, Entity, Index } from 'typeorm';
import type { OrderStatus } from '@einvoice/types';

@Entity({ name: 'orders' })
@Index('idx_orders_tenant_session_idempotency', ['tenantId', 'sessionId', 'idempotencyKey'], { unique: true })
export class Order extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar', length: 64 })
  tenantId: string;

  @Column({ name: 'table_id', type: 'uuid' })
  tableId: string;

  @Column({ name: 'table_name', type: 'varchar', length: 255 })
  tableName: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @Column({ type: 'varchar', length: 20 })
  status: OrderStatus;

  @Column({ name: 'total_amount', type: 'int', default: 0 })
  totalAmount: number;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 64 })
  idempotencyKey: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true })
  confirmedAt: Date | null;

  @Column({ name: 'confirmed_by_user_id', type: 'varchar', length: 64, nullable: true })
  confirmedByUserId: string | null;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'cancelled_by_user_id', type: 'varchar', length: 64, nullable: true })
  cancelledByUserId: string | null;

  @Column({ name: 'cancel_reason', type: 'varchar', length: 255, nullable: true })
  cancelReason: string | null;
}
