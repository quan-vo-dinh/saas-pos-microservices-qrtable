import { BaseEntity } from './base.entity';
import { Column, Entity, Index, Unique } from 'typeorm';
import { CATEGORY_STATUS } from '@common/constants/enum/catalog.enum';

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

  @Column({ type: 'varchar', length: 20, default: CATEGORY_STATUS.ACTIVE })
  status: CATEGORY_STATUS;
}
