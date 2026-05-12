import { TCP_SERVICES, TcpProvider } from '@common/configuration/tcp.config';
import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { AdminBillingController } from './controllers/admin-billing.controller';
import { AdminPlansController } from './controllers/admin-plans.controller';
import { AdminTenantsController } from './controllers/admin-tenants.controller';
import { CurrentTenantController } from './controllers/current-tenant.controller';
import { DashboardPaymentSettingsController } from './controllers/dashboard-payment-settings.controller';
import { DashboardSubscriptionController } from './controllers/dashboard-subscription.controller';
import { PublicSaasController } from './controllers/public-saas.controller';
import { PublicTenantController } from './controllers/public-tenant.controller';
import { SaasController } from './controllers/saas.controller';
import { SepayWebhookController } from './controllers/sepay-webhook.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([TcpProvider(TCP_SERVICES.SAAS_SERVICE), TcpProvider(TCP_SERVICES.PAYMENT_SERVICE)]),
  ],
  controllers: [
    SaasController,
    PublicTenantController,
    CurrentTenantController,
    PublicSaasController,
    AdminTenantsController,
    AdminPlansController,
    AdminBillingController,
    DashboardSubscriptionController,
    DashboardPaymentSettingsController,
    SepayWebhookController,
  ],
  providers: [],
})
export class SaasModule {}
