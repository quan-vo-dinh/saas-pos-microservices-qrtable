import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('pricing_plans')
@Index('uq_pricing_plans_code', ['code'], { unique: true })
@Index('ix_pricing_plans_active_order', ['isActive', 'displayOrder'])
export class PricingPlan extends BaseEntity {
  @Column({ type: 'varchar', length: 40 })
  code!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'billing_period', type: 'varchar', length: 20, default: 'MONTHLY' })
  billingPeriod!: 'MONTHLY' | 'YEARLY';

  @Column({ name: 'price_vnd', type: 'int', default: 0 })
  priceVnd!: number;

  @Column({ name: 'max_tables', type: 'int', default: 0 })
  maxTables!: number;

  @Column({ name: 'max_staff', type: 'int', default: 0 })
  maxStaff!: number;

  @Column({ name: 'max_orders_per_day', type: 'int', default: 0 })
  maxOrdersPerDay!: number;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  features!: string[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder!: number;
}
