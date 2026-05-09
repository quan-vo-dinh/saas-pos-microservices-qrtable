import type { PaymentMethod, PaymentStatusValue } from '@einvoice/types';
import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'payments' })
@Check(`"status" IN ('PENDING', 'PAID', 'REFUND_PENDING', 'REFUNDED', 'FAILED')`)
@Check(`"method" IS NULL OR "method" IN ('CASH', 'VIETQR')`)
@Check(`"raw_total" >= 0`)
@Check(`"rounded_total" >= 0`)
@Check(`"paid_amount" IS NULL OR "paid_amount" >= 0`)
@Check(`"amount_received" IS NULL OR "amount_received" >= 0`)
@Check(`"change_amount" IS NULL OR "change_amount" >= 0`)
@Index(['tenantId', 'billId'], { unique: true })
@Index(['billReference'], { unique: true })
@Index(['sepayTransactionId'], { unique: true, where: 'sepay_transaction_id IS NOT NULL' })
@Index(['tenantId', 'status', 'createdAt'])
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 64 })
  tenantId!: string;

  @Column({ name: 'bill_id', type: 'uuid' })
  billId!: string;

  @Column({ name: 'bill_reference', type: 'varchar', length: 32 })
  billReference!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  method!: PaymentMethod | null;

  @Column({ type: 'varchar', length: 30, default: 'PENDING' })
  status!: PaymentStatusValue;

  @Column({ name: 'raw_total', type: 'int' })
  rawTotal!: number;

  @Column({ name: 'rounded_total', type: 'int' })
  roundedTotal!: number;

  @Column({ name: 'rounding_delta', type: 'int' })
  roundingDelta!: number;

  @Column({ name: 'paid_amount', type: 'int', nullable: true })
  paidAmount!: number | null;

  @Column({ name: 'amount_received', type: 'int', nullable: true })
  amountReceived!: number | null;

  @Column({ name: 'change_amount', type: 'int', nullable: true })
  changeAmount!: number | null;

  @Column({ name: 'sepay_transaction_id', type: 'int', nullable: true })
  sepayTransactionId!: number | null;

  @Column({ name: 'sepay_reference_code', type: 'varchar', length: 120, nullable: true })
  sepayReferenceCode!: string | null;

  @Column({ name: 'sepay_gateway', type: 'varchar', length: 80, nullable: true })
  sepayGateway!: string | null;

  @Column({ name: 'sepay_account_number', type: 'varchar', length: 64, nullable: true })
  sepayAccountNumber!: string | null;

  @Column({ name: 'sepay_transfer_content', type: 'text', nullable: true })
  sepayTransferContent!: string | null;

  @Column({ name: 'sepay_transaction_date', type: 'timestamp', nullable: true })
  sepayTransactionDate!: Date | null;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
