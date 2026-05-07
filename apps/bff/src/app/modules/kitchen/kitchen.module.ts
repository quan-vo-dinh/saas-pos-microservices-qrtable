import { TCP_SERVICES, TcpProvider } from '@common/configuration/tcp.config';
import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { RealtimeModule } from '../realtime/realtime.module';
import { KitchenController } from './controllers/kitchen.controller';
import { KdsStationAccessService } from './services/kds-station-access.service';

@Module({
  imports: [
    ClientsModule.registerAsync([TcpProvider(TCP_SERVICES.KITCHEN_SERVICE), TcpProvider(TCP_SERVICES.ORDER_SERVICE)]),
    RealtimeModule,
  ],
  controllers: [KitchenController],
  providers: [KdsStationAccessService],
})
export class KitchenModule {}
