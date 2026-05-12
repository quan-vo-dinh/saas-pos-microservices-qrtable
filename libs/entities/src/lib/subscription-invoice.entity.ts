import { SubscriptionInvoiceStatus } from '@common/constants/saas.constants';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('subscription_invoices')
@Index('uq_subscription_invoices_billing_ref', ['billingReference'], { unique: true })
@Index('uq_subscription_invoices_sepay_tx', ['sepayTransactionId'], {
  unique: true,
  where: '"sepay_transaction_id" IS NOT NULL',
})
@Index('ix_subscription_invoices_tenant_status', ['tenantId', 'status'])
export class SubscriptionInvoice extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'pricing_plan_id', type: 'uuid' })
  pricingPlanId!: string;

  @Column({ name: 'plan_code_snapshot', type: 'varchar', length: 40 })
  planCodeSnapshot!: string;

  @Column({ name: 'amount_vnd', type: 'bigint' })
  amountVnd!: number;

  @Column({ name: 'billing_period', type: 'varchar', length: 20 })
  billingPeriod!: 'MONTHLY' | 'YEARLY';

  @Column({ name: 'period_starts_at', type: 'timestamptz' })
  periodStartsAt!: Date;

  @Column({ name: 'period_ends_at', type: 'timestamptz' })
  periodEndsAt!: Date;

  @Column({ name: 'billing_reference', type: 'varchar', length: 32 })
  billingReference!: string;

  @Column({ type: 'varchar', length: 20, default: SubscriptionInvoiceStatus.PENDING })
  status!: SubscriptionInvoiceStatus;

  @Column({ name: 'qr_url', type: 'text', nullable: true })
  qrUrl?: string | null;

  @Column({ name: 'qr_expires_at', type: 'timestamptz' })
  qrExpiresAt!: Date;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt?: Date | null;

  @Column({ name: 'paid_amount_vnd', type: 'bigint', nullable: true })
  paidAmountVnd?: number | null;

  @Column({ name: 'sepay_transaction_id', type: 'bigint', nullable: true })
  sepayTransactionId?: number | null;

  @Column({ name: 'sepay_reference_code', type: 'varchar', length: 120, nullable: true })
  sepayReferenceCode?: string | null;

  @Column({ name: 'sepay_account_number', type: 'varchar', length: 64, nullable: true })
  sepayAccountNumber?: string | null;

  @Column({ name: 'sepay_gateway', type: 'varchar', length: 80, nullable: true })
  sepayGateway?: string | null;

  @Column({ name: 'sepay_transfer_content', type: 'text', nullable: true })
  sepayTransferContent?: string | null;

  @Column({ name: 'sepay_transaction_date', type: 'timestamptz', nullable: true })
  sepayTransactionDate?: Date | null;

  @Column({ name: 'manually_confirmed_by_user_id', type: 'uuid', nullable: true })
  manuallyConfirmedByUserId?: string | null;

  @Column({ name: 'manually_confirmed_at', type: 'timestamptz', nullable: true })
  manuallyConfirmedAt?: Date | null;

  @Column({ name: 'requested_by_user_id', type: 'uuid' })
  requestedByUserId!: string;

  @Column({ name: 'expired_at', type: 'timestamptz', nullable: true })
  expiredAt?: Date | null;

  @Column({ name: 'canceled_at', type: 'timestamptz', nullable: true })
  canceledAt?: Date | null;

  @Column({ name: 'canceled_reason', type: 'text', nullable: true })
  canceledReason?: string | null;
}
