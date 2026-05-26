import { SubscriptionStatus } from '@common/constants/saas.constants';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('subscriptions')
@Index('ix_subscriptions_tenant_status', ['tenantId', 'status'])
@Index('ix_subscriptions_expires_at_active', ['expiresAt', 'status'])
export class Subscription extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'pricing_plan_id', type: 'uuid' })
  pricingPlanId!: string;

  @Column({ name: 'plan_code_snapshot', type: 'varchar', length: 40 })
  planCodeSnapshot!: string;

  @Column({ name: 'price_vnd_snapshot', type: 'bigint' })
  priceVndSnapshot!: number;

  @Column({ type: 'varchar', length: 20, default: SubscriptionStatus.ACTIVE })
  status!: SubscriptionStatus;

  @Column({ name: 'starts_at', type: 'timestamptz', default: () => 'now()' })
  startsAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;

  @Column({ name: 'superseded_by_subscription_id', type: 'uuid', nullable: true })
  supersededBySubscriptionId?: string | null;

  @Column({ name: 'canceled_at', type: 'timestamptz', nullable: true })
  canceledAt?: Date | null;

  @Column({ name: 'canceled_reason', type: 'text', nullable: true })
  canceledReason?: string | null;

  @Column({ name: 'expired_at', type: 'timestamptz', nullable: true })
  expiredAt?: Date | null;

  @Column({ type: 'varchar', length: 30, default: 'ADMIN_ASSIGN' })
  source!: 'ADMIN_ASSIGN' | 'INVOICE_PAID' | 'INITIAL_ONBOARDING';

  @Column({ name: 'source_invoice_id', type: 'uuid', nullable: true })
  sourceInvoiceId?: string | null;

  @Column({ name: 'created_by_user_id', type: 'varchar', length: 64, nullable: true })
  createdByUserId?: string | null;
}
