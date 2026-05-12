import { TenantPaymentConnectionStatus } from '@common/constants/saas.constants';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tenant_payment_settings' })
@Index('uq_tenant_payment_settings_tenant', ['tenantId'], { unique: true })
export class TenantPaymentSettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'cash_enabled', type: 'boolean', default: true })
  cashEnabled!: boolean;

  @Column({ name: 'vietqr_enabled', type: 'boolean', default: false })
  vietqrEnabled!: boolean;

  @Column({ name: 'vietqr_bank_name', type: 'varchar', length: 100, nullable: true })
  vietqrBankName?: string | null;

  @Column({ name: 'vietqr_account_number', type: 'varchar', length: 64, nullable: true })
  vietqrAccountNumber?: string | null;

  @Column({ name: 'vietqr_account_holder', type: 'varchar', length: 160, nullable: true })
  vietqrAccountHolder?: string | null;

  @Column({ name: 'sepay_bank_account_uuid', type: 'varchar', length: 120, nullable: true })
  sepayBankAccountUuid?: string | null;

  @Column({ name: 'sepay_access_token_encrypted', type: 'text', nullable: true })
  sepayAccessTokenEncrypted?: string | null;

  @Column({ name: 'sepay_refresh_token_encrypted', type: 'text', nullable: true })
  sepayRefreshTokenEncrypted?: string | null;

  @Column({ name: 'sepay_token_expires_at', type: 'timestamptz', nullable: true })
  sepayTokenExpiresAt?: Date | null;

  @Column({ name: 'sepay_token_scopes', type: 'text', array: true, default: '{}' })
  sepayTokenScopes!: string[];

  @Column({ name: 'sepay_webhook_id', type: 'varchar', length: 120, nullable: true })
  sepayWebhookId?: string | null;

  @Column({ name: 'webhook_secret_encrypted', type: 'text', nullable: true })
  webhookSecretEncrypted?: string | null;

  @Column({ name: 'webhook_verified_at', type: 'timestamptz', nullable: true })
  webhookVerifiedAt?: Date | null;

  @Column({
    name: 'connection_status',
    type: 'varchar',
    length: 20,
    default: TenantPaymentConnectionStatus.NOT_CONNECTED,
  })
  connectionStatus!: TenantPaymentConnectionStatus;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string | null;

  @Column({ name: 'last_error_at', type: 'timestamptz', nullable: true })
  lastErrorAt?: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt!: Date;
}
