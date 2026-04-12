import { BaseEntity } from './base.entity';
import { Column, Entity, Index, Unique } from 'typeorm';

export type CategoryStatus = 'active' | 'inactive';

@Entity({ name: 'categories' })
@Unique(['tenantId', 'name'])
@Index(['tenantId', 'sortOrder'])
export class Category extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar', length: 64 })
  tenantId: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: CategoryStatus;
}
