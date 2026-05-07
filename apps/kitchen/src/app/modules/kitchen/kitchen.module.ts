import { ClientsModule } from '@nestjs/microservices';
import { TcpProvider, TCP_SERVICES } from '@common/configuration/tcp.config';
import { Module } from '@nestjs/common';
import { RedisClientModule } from '@common/providers/redis-client/redis-client.module';
import { KitchenController } from './controllers/kitchen.controller';
import { KdsRedisRepository } from './repositories/kds-redis.repository';
import { KdsTicketService } from './services/kds-ticket.service';
import { KitchenEventsPublisher } from './services/kitchen-events.publisher';
import { KitchenKafkaProducer } from './services/kitchen-kafka.producer';
import { KitchenRecoveryService } from './services/kitchen-recovery.service';
import { KitchenSlaWorker } from './services/kitchen-sla.worker';
import { OrderConfirmedConsumer } from './services/order-confirmed.consumer';

@Module({
  imports: [RedisClientModule, ClientsModule.registerAsync([TcpProvider(TCP_SERVICES.ORDER_SERVICE)])],
  controllers: [KitchenController],
  providers: [
    KdsRedisRepository,
    KitchenEventsPublisher,
    KdsTicketService,
    OrderConfirmedConsumer,
    KitchenKafkaProducer,
    KitchenSlaWorker,
    KitchenRecoveryService,
  ],
})
export class KitchenModule {}
