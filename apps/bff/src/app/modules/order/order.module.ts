import { TCP_SERVICES, TcpProvider } from '@common/configuration/tcp.config';
import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { RealtimeModule } from '../realtime/realtime.module';
import { CustomerOrderController } from './controllers/customer-order.controller';
import { CustomerSessionController } from './controllers/customer-session.controller';
import { StaffOrderController } from './controllers/staff-order.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([
      TcpProvider(TCP_SERVICES.ORDER_SERVICE),
      TcpProvider(TCP_SERVICES.KITCHEN_SERVICE),
      TcpProvider(TCP_SERVICES.PAYMENT_SERVICE),
    ]),
    RealtimeModule,
  ],
  controllers: [CustomerSessionController, CustomerOrderController, StaffOrderController],
})
export class OrderModule {}
