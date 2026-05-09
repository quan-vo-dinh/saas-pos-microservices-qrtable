import { TCP_SERVICES, TcpProvider } from '@common/configuration/tcp.config';
import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { PaymentController } from './controllers/payment.controller';
import { SepayWebhookSecretGuard } from './guards/sepay-webhook-secret.guard';

@Module({
  imports: [ClientsModule.registerAsync([TcpProvider(TCP_SERVICES.PAYMENT_SERVICE)])],
  controllers: [PaymentController],
  providers: [SepayWebhookSecretGuard],
})
export class PaymentModule {}
