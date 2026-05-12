import { TCP_SERVICES, TcpProvider } from '@common/configuration/tcp.config';
import { RedisClientModule } from '@common/providers/redis-client/redis-client.module';
import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './controllers/payment.controller';
import { AuditPaymentEntity } from './entities/audit-payment.entity';
import { PaymentOutboxEventEntity } from './entities/payment-outbox-event.entity';
import { PaymentEntity } from './entities/payment.entity';
import { RefundEntity } from './entities/refund.entity';
import { TenantPaymentSettingsEntity } from './entities/tenant-payment-settings.entity';
import { CONFIGURATION } from '../../../configuration';
import { AuditPaymentRepository } from './repositories/audit-payment.repository';
import { PaymentOutboxRepository } from './repositories/payment-outbox.repository';
import { PaymentRepository } from './repositories/payment.repository';
import { RefundRepository } from './repositories/refund.repository';
import { TenantPaymentSettingsRepository } from './repositories/tenant-payment-settings.repository';
import { PaymentOutboxPublisherService } from './services/payment-outbox-publisher.service';
import { PaymentMapper } from './services/payment.mapper';
import { PaymentOrderGateway } from './services/payment-order.gateway';
import { PaymentQueryService } from './services/payment-query.service';
import { PaymentReferenceService } from './services/payment-reference.service';
import { PAYMENT_SECRETS_ENCRYPTION_KEY, PaymentSecretsService } from './services/payment-secrets.service';
import { PaymentSettlementService } from './services/payment-settlement.service';
import { PaymentService } from './services/payment.service';
import { RefundService } from './services/refund.service';
import { SEPAY_OAUTH_CLIENT_CONFIG, SepayOAuthClientService } from './services/sepay-oauth-client.service';
import { SepayWebhookService } from './services/sepay-webhook.service';
import { TenantPaymentSettingsService } from './services/tenant-payment-settings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentEntity,
      RefundEntity,
      AuditPaymentEntity,
      PaymentOutboxEventEntity,
      TenantPaymentSettingsEntity,
    ]),
    RedisClientModule,
    ClientsModule.registerAsync([TcpProvider(TCP_SERVICES.ORDER_SERVICE)]),
  ],
  controllers: [PaymentController],
  providers: [
    PaymentMapper,
    PaymentOrderGateway,
    PaymentQueryService,
    PaymentSettlementService,
    SepayWebhookService,
    PaymentService,
    RefundService,
    {
      provide: PAYMENT_SECRETS_ENCRYPTION_KEY,
      useFactory: () => CONFIGURATION.PAYMENT_SECRETS_CONFIG.ENCRYPTION_KEY,
    },
    PaymentSecretsService,
    {
      provide: SEPAY_OAUTH_CLIENT_CONFIG,
      useFactory: () => ({
        baseUrl: CONFIGURATION.SEPAY_OAUTH_CONFIG.BASE_URL ?? 'https://my.sepay.vn',
        clientId: CONFIGURATION.SEPAY_OAUTH_CONFIG.CLIENT_ID ?? '',
        clientSecret: CONFIGURATION.SEPAY_OAUTH_CONFIG.CLIENT_SECRET ?? '',
        redirectUri: CONFIGURATION.SEPAY_OAUTH_CONFIG.REDIRECT_URI ?? '',
      }),
    },
    SepayOAuthClientService,
    TenantPaymentSettingsService,
    PaymentReferenceService,
    PaymentOutboxPublisherService,
    PaymentRepository,
    RefundRepository,
    AuditPaymentRepository,
    PaymentOutboxRepository,
    TenantPaymentSettingsRepository,
  ],
})
export class PaymentModule {}
