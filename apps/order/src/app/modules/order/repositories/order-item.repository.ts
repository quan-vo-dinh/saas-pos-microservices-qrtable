import { OrderItem } from '@common/entities/order-item.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderStatus } from '@einvoice/types';
import { roundVnd } from '@common/utils/vnd-rounding.util';
import { EntityManager, Repository } from 'typeorm';

@Injectable()
export class OrderItemRepository {
  constructor(@InjectRepository(OrderItem) private readonly repo: Repository<OrderItem>) {}

  findByOrderIdAndTenant(orderId: string, tenantId: string): Promise<OrderItem[]> {
    return this.repo.find({ where: { orderId, tenantId } });
  }

  findByOrderIdAndTenantWithManager(orderId: string, tenantId: string, manager: EntityManager): Promise<OrderItem[]> {
    return manager.getRepository(OrderItem).find({ where: { orderId, tenantId } });
  }

  async aggregateTopItems(
    tenantId: string,
    fromUtc: Date,
    toUtc: Date,
    limit: number,
  ): Promise<Array<{ menuItemId: string; menuItemName: string; quantity: number; revenueVnd: number }>> {
    const rows = await this.repo
      .createQueryBuilder('oi')
      .innerJoin('orders', 'o', 'o.id = oi.order_id AND o.tenant_id = oi.tenant_id')
      .select('oi.menuItemId', 'menuItemId')
      .addSelect('oi.menuItemName', 'menuItemName')
      .addSelect('SUM(oi.quantity)', 'quantity')
      .addSelect('SUM(oi.quantity * oi.unit_price)', 'rawRevenue')
      .where('oi.tenantId = :tenantId', { tenantId })
      .andWhere('o.status != :cancelled', { cancelled: OrderStatus.CANCELED })
      .andWhere('o.createdAt >= :fromUtc', { fromUtc })
      .andWhere('o.createdAt <= :toUtc', { toUtc })
      .groupBy('oi.menuItemId')
      .addGroupBy('oi.menuItemName')
      .orderBy('quantity', 'DESC')
      .take(limit)
      .getRawMany<{ menuItemId: string; menuItemName: string; quantity: string; rawRevenue: string }>();

    return rows.map((row) => ({
      menuItemId: row.menuItemId,
      menuItemName: row.menuItemName,
      quantity: Number(row.quantity) || 0,
      revenueVnd: roundVnd(Number(row.rawRevenue) || 0),
    }));
  }
}
