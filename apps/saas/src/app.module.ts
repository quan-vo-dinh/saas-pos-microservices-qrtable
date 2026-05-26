import { createTypeOrmProvider } from '@common/configuration/type-orm.config';
import { TCP_SERVICES, TcpProvider } from '@common/configuration/tcp.config';
import { PricingPlan } from '@common/entities/pricing-plan.entity';
import { SaasOutboxEvent } from '@common/entities/saas-outbox-event.entity';
import { Subscription } from '@common/entities/subscription.entity';
import { SubscriptionInvoice } from '@common/entities/subscription-invoice.entity';
import { Tenant } from '@common/entities/tenant.entity';
import { RedisClientModule } from '@common/providers/redis-client/redis-client.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CONFIGURATION, TConfiguration } from './configuration';
import { SaasController } from './controllers/saas.controller';
import { SaasService } from './services/saas.service';
import { SaasRepository } from './repositories/saas.repository';
import { PricingPlanRepository } from './repositories/pricing-plan.repository';
import { SaasOutboxRepository } from './repositories/saas-outbox.repository';
import { SubscriptionInvoiceRepository } from './repositories/subscription-invoice.repository';
import { SubscriptionRepository } from './repositories/subscription.repository';
import { TenantRepository } from './repositories/tenant.repository';
import { OnboardingSagaService } from './services/onboarding-saga.service';
import { PricingPlanAdminService } from './services/pricing-plan-admin.service';
import { SaasOutboxPublisherService } from './services/saas-outbox-publisher.service';
import { SlugService } from './services/slug.service';
import { SubscriptionDashboardService } from './services/subscription-dashboard.service';
import { SubscriptionInvoiceService } from './services/subscription-invoice.service';
import { SubscriptionCacheService } from './services/subscription-cache.service';
import { SubscriptionService } from './services/subscription.service';
import { TenantAdminService } from './services/tenant-admin.service';
import { TenantLifecycleService } from './services/tenant-lifecycle.service';
import { TenantStatusCacheService } from './services/tenant-status-cache.service';
import { SubscriptionInvoiceExpireCronService } from './services/subscription-invoice-expire-cron.service';
import { TenantSuspendCronService } from './services/tenant-suspend-cron.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [() => CONFIGURATION] }),
    createTypeOrmProvider([Tenant, PricingPlan, Subscription, SubscriptionInvoice, SaasOutboxEvent]),
    RedisClientModule,
    ScheduleModule.forRoot(),
    ClientsModule.registerAsync([
      TcpProvider(TCP_SERVICES.AUTHORIZER_SERVICE),
      TcpProvider(TCP_SERVICES.USER_ACCESS_SERVICE),
      TcpProvider(TCP_SERVICES.PAYMENT_SERVICE),
    ]),
    TypeOrmModule.forFeature([Tenant, PricingPlan, Subscription, SubscriptionInvoice, SaasOutboxEvent]),
  ],
  controllers: [SaasController],
  providers: [
    SaasService,
    SaasRepository,
    SlugService,
    PricingPlanAdminService,
    PricingPlanRepository,
    SubscriptionRepository,
    SubscriptionDashboardService,
    SubscriptionService,
    SubscriptionCacheService,
    TenantRepository,
    TenantAdminService,
    TenantLifecycleService,
    TenantStatusCacheService,
    OnboardingSagaService,
    SubscriptionInvoiceRepository,
    SubscriptionInvoiceService,
    TenantSuspendCronService,
    SubscriptionInvoiceExpireCronService,
    SaasOutboxRepository,
    SaasOutboxPublisherService,
  ],
})
export class AppModule {
  static CONFIGURATION: TConfiguration = CONFIGURATION;
}
