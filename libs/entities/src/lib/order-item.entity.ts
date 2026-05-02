import { BaseEntity } from './base.entity';
import { Column, Entity, Index } from 'typeorm';
import { OrderItemStatus, PreparationStation } from '@einvoice/types';

@Entity({ name: 'order_items' })
@Index(['tenantId', 'orderId'])
export class OrderItem extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar', length: 64 })
  tenantId: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ name: 'menu_item_id', type: 'uuid' })
  menuItemId: string;

  @Column({ name: 'menu_item_name', type: 'varchar', length: 255 })
  menuItemName: string;

  @Column({ name: 'menu_item_image_url', type: 'varchar', length: 500, nullable: true })
  menuItemImageUrl: string | null;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'int', default: 0 })
  unitPrice: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  @Column({ type: 'varchar', length: 20 })
  status: OrderItemStatus;

  @Column({ type: 'varchar', length: 20, nullable: true })
  station: PreparationStation | null;
}
