import { createTypeOrmProvider } from '@common/configuration/type-orm.config';
import { Bill } from '@common/entities/bill.entity';
import { OrderItem } from '@common/entities/order-item.entity';
import { Order } from '@common/entities/order.entity';
import { OutboxEvent } from '@common/entities/outbox-event.entity';
import { ServiceRequest } from '@common/entities/service-request.entity';
import { Session } from '@common/entities/session.entity';
import { RedisClientModule } from '@common/providers/redis-client/redis-client.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CONFIGURATION, TConfiguration } from '../configuration';
import { OrderModule } from './modules/order/order.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [() => CONFIGURATION] }),
    createTypeOrmProvider([Session, Order, OrderItem, Bill, ServiceRequest, OutboxEvent]),
    RedisClientModule,
    OrderModule,
  ],
})
export class AppModule {
  static CONFIGURATION: TConfiguration = CONFIGURATION;
}
