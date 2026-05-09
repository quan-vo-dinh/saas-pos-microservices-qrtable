import type { PaymentActorTypeValue, PaymentAuditActionValue } from '@einvoice/types';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'audit_payments' })
@Index(['paymentId', 'createdAt'])
@Index(['tenantId', 'createdAt'])
export class AuditPaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 64 })
  tenantId!: string;

  @Column({ name: 'payment_id', type: 'uuid', nullable: true })
  paymentId!: string | null;

  @Column({ name: 'refund_id', type: 'uuid', nullable: true })
  refundId!: string | null;

  @Column({ type: 'varchar', length: 60 })
  action!: PaymentAuditActionValue;

  @Column({ name: 'actor_type', type: 'varchar', length: 20 })
  actorType!: PaymentActorTypeValue;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId!: string | null;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  meta!: Record<string, unknown> | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
