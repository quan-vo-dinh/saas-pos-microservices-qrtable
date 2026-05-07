import { RedisClientModule } from '@common/providers/redis-client/redis-client.module';
import { Module } from '@nestjs/common';
import { KitchenController } from './controllers/kitchen.controller';
import { KdsRedisRepository } from './repositories/kds-redis.repository';
import { KdsTicketService } from './services/kds-ticket.service';
import { KitchenEventsPublisher } from './services/kitchen-events.publisher';
import { OrderConfirmedConsumer } from './services/order-confirmed.consumer';

@Module({
  imports: [RedisClientModule],
  controllers: [KitchenController],
  providers: [KdsRedisRepository, KitchenEventsPublisher, KdsTicketService, OrderConfirmedConsumer],
})
export class KitchenModule {}
