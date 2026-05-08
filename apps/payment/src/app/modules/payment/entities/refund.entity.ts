import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type RefundStatus = 'PENDING_STAFF_ACTION' | 'CONFIRMED' | 'CANCELED';

@Entity({ name: 'refunds' })
@Index(['tenantId', 'paymentId'])
@Index(['tenantId', 'status', 'createdAt'])
@Index(['paymentId'], { unique: true, where: "status IN ('PENDING_STAFF_ACTION', 'CONFIRMED')" })
export class RefundEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 64 })
  tenantId!: string;

  @Column({ name: 'payment_id', type: 'uuid' })
  paymentId!: string;

  @Column({ type: 'int' })
  amount!: number;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ name: 'customer_bank_account', type: 'varchar', length: 120, nullable: true })
  customerBankAccount!: string | null;

  @Column({ name: 'customer_bank_name', type: 'varchar', length: 80, nullable: true })
  customerBankName!: string | null;

  @Column({ name: 'customer_account_name', type: 'varchar', length: 120, nullable: true })
  customerAccountName!: string | null;

  @Column({ type: 'varchar', length: 30, default: 'PENDING_STAFF_ACTION' })
  status!: RefundStatus;

  @Column({ name: 'requested_by_user_id', type: 'uuid' })
  requestedByUserId!: string;

  @Column({ name: 'requested_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  requestedAt!: Date;

  @Column({ name: 'confirmed_by_user_id', type: 'uuid', nullable: true })
  confirmedByUserId!: string | null;

  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true })
  confirmedAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
