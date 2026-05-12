import { TenantStatus, TenantType } from '@common/constants/saas.constants';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity({ name: 'tenants' })
@Index('uq_tenants_slug', ['slug'], { unique: true })
@Index('ix_tenants_status_created_at', ['status', 'createdAt'])
export class Tenant extends BaseEntity {
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 120 })
  slug!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 20, default: TenantStatus.ACTIVE })
  status!: TenantStatus;

  @Column({ type: 'varchar', length: 30, default: TenantType.RESTAURANT })
  type!: TenantType;

  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId?: string | null;

  @Column({ name: 'default_currency', type: 'varchar', length: 10, default: 'VND' })
  defaultCurrency!: string;

  @Column({ name: 'default_locale', type: 'varchar', length: 20, default: 'vi-VN' })
  defaultLocale!: string;

  @Column({
    name: 'operating_modes',
    type: 'text',
    array: true,
    default: () => "ARRAY['INSTANT_ORDER','DIGITAL_MENU']",
  })
  operatingModes!: string[];

  @Column({ name: 'suspended_at', type: 'timestamptz', nullable: true })
  suspendedAt?: Date | null;

  @Column({ name: 'suspended_reason', type: 'text', nullable: true })
  suspendedReason?: string | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt?: Date | null;

  @Column({ name: 'closed_reason', type: 'text', nullable: true })
  closedReason?: string | null;
}
