import { TCP_SERVICES, TcpProvider } from '@common/configuration/tcp.config';
import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { PaymentController } from './controllers/payment.controller';

@Module({
  imports: [ClientsModule.registerAsync([TcpProvider(TCP_SERVICES.PAYMENT_SERVICE)])],
  controllers: [PaymentController],
})
export class PaymentModule {}
