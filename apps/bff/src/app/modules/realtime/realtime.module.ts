import { Module } from '@nestjs/common';
import { OrderEventsGateway } from './gateways/order-events.gateway';
import { RealtimeEventsService } from './services/realtime-events.service';

@Module({
  providers: [OrderEventsGateway, RealtimeEventsService],
  exports: [RealtimeEventsService],
})
export class RealtimeModule {}
