import { Module } from '@nestjs/common';
import { AuthorizerModule } from '../authorizer/authorizer.module';
import { OrderEventsGateway } from './gateways/order-events.gateway';
import { KdsInternalEventsSubscriber } from './services/kds-internal-events.subscriber';
import { RealtimeAuthService } from './services/realtime-auth.service';
import { RealtimeEventsService } from './services/realtime-events.service';
import { RealtimeKafkaBridgeService } from './services/realtime-kafka-bridge.service';

@Module({
  imports: [AuthorizerModule],
  providers: [
    OrderEventsGateway,
    RealtimeEventsService,
    RealtimeAuthService,
    KdsInternalEventsSubscriber,
    RealtimeKafkaBridgeService,
  ],
  exports: [RealtimeEventsService],
})
export class RealtimeModule {}
