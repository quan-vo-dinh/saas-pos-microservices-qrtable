import { BaseEntity } from './base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Area } from './area.entity';

export type TableStatus = 'available' | 'occupied' | 'billing' | 'cleaning';

@Entity({ name: 'tables' })
@Unique(['tenantId', 'name'])
@Unique(['tenantId', 'qrToken'])
@Index(['tenantId', 'areaId'])
@Index(['tenantId', 'status'])
export class Table extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar', length: 64 })
  tenantId: string;

  @Column({ name: 'area_id', type: 'uuid' })
  areaId: string;

  @ManyToOne(() => Area, { eager: false })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'int', default: 1 })
  capacity: number;

  @Column({ type: 'varchar', length: 20, default: 'available' })
  status: TableStatus;

  @Column({ name: 'qr_token', type: 'varchar', length: 255 })
  qrToken: string;

  @Column({ name: 'session_id', type: 'varchar', length: 255, nullable: true })
  sessionId: string | null;
}
