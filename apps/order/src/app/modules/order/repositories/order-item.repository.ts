import { OrderItem } from '@common/entities/order-item.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class OrderItemRepository {
  constructor(@InjectRepository(OrderItem) private readonly repo: Repository<OrderItem>) {}

  findByOrderIdAndTenant(orderId: string, tenantId: string): Promise<OrderItem[]> {
    return this.repo.find({ where: { orderId, tenantId } });
  }
}
