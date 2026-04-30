import { BaseEntity } from './base.entity';
import { Column, Entity, Index } from 'typeorm';
import { BillStatus, PaymentMethod } from '@einvoice/types';

@Entity({ name: 'bills' })
@Index(['tenantId', 'sessionId'])
export class Bill extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar', length: 64 })
  tenantId: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @Column({ name: 'order_ids', type: 'simple-array', default: '' })
  orderIds: string[] = [];

  @Column({ type: 'int', default: 0 })
  subtotal: number;

  @Column({ type: 'int', default: 0 })
  total: number;

  @Column({ name: 'rounding_amount', type: 'int', default: 0 })
  roundingAmount: number;

  @Column({ name: 'payment_method', type: 'varchar', length: 20, nullable: true })
  paymentMethod: PaymentMethod | null;

  @Column({ type: 'varchar', length: 20 })
  status: BillStatus;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date | null;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date | null;
}
