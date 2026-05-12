import { RedisClientModule } from '@common/providers/redis-client/redis-client.module';
import { TCP_SERVICES, TcpProvider } from '@common/configuration/tcp.config';
import { Bill } from '@common/entities/bill.entity';
import { OrderItem } from '@common/entities/order-item.entity';
import { Order } from '@common/entities/order.entity';
import { OutboxEvent } from '@common/entities/outbox-event.entity';
import { ServiceRequest } from '@common/entities/service-request.entity';
import { Session } from '@common/entities/session.entity';
import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderController } from './controllers/order.controller';
import { BillRepository } from './repositories/bill.repository';
import { OrderItemRepository } from './repositories/order-item.repository';
import { OrderRepository } from './repositories/order.repository';
import { OutboxEventRepository } from './repositories/outbox-event.repository';
import { ServiceRequestRepository } from './repositories/service-request.repository';
import { SessionRepository } from './repositories/session.repository';
import { BillService } from './services/bill.service';
import { CartService } from './services/cart.service';
import { OrderService } from './services/order.service';
import { OutboxPublisherService } from './services/outbox-publisher.service';
import { OrderQuotaService } from './services/order-quota.service';
import { PaymentEventsConsumerService } from './services/payment-events-consumer.service';
import { ServiceRequestService } from './services/service-request.service';
import { SessionService } from './services/session.service';
import { TransferService } from './services/transfer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, Order, OrderItem, Bill, ServiceRequest, OutboxEvent]),
    ClientsModule.registerAsync([TcpProvider(TCP_SERVICES.CATALOG_SERVICE)]),
    RedisClientModule,
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderQuotaService,
    BillService,
    ServiceRequestService,
    TransferService,
    OutboxPublisherService,
    PaymentEventsConsumerService,
    SessionService,
    CartService,
    OrderRepository,
    OrderItemRepository,
    SessionRepository,
    BillRepository,
    ServiceRequestRepository,
    OutboxEventRepository,
  ],
})
export class OrderModule {}
