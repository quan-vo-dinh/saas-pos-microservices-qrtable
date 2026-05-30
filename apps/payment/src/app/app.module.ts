import { createTypeOrmProvider } from '@common/configuration/type-orm.config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CONFIGURATION, TConfiguration } from '../configuration';
import { AuditPaymentEntity } from './modules/payment/entities/audit-payment.entity';
import { PaymentOutboxEventEntity } from './modules/payment/entities/payment-outbox-event.entity';
import { PaymentEntity } from './modules/payment/entities/payment.entity';
import { TenantPaymentSettingsEntity } from './modules/payment/entities/tenant-payment-settings.entity';
import { PaymentModule } from './modules/payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [() => CONFIGURATION] }),
    createTypeOrmProvider([PaymentEntity, AuditPaymentEntity, PaymentOutboxEventEntity, TenantPaymentSettingsEntity]),
    PaymentModule,
  ],
})
export class AppModule {
  static CONFIGURATION: TConfiguration = CONFIGURATION;
}
