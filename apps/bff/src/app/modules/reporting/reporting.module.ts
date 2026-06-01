import { TCP_SERVICES, TcpProvider } from '@common/configuration/tcp.config';
import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { AdminAnalyticsController } from './controllers/admin-analytics.controller';
import { DashboardReportController } from './controllers/dashboard-report.controller';
import { TenantSubscriptionContextGuard } from './guards/tenant-subscription-context.guard';
import { TenantSubscriptionResolver } from './services/tenant-subscription-resolver.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      TcpProvider(TCP_SERVICES.PAYMENT_SERVICE),
      TcpProvider(TCP_SERVICES.ORDER_SERVICE),
      TcpProvider(TCP_SERVICES.CATALOG_SERVICE),
      TcpProvider(TCP_SERVICES.SAAS_SERVICE),
    ]),
  ],
  controllers: [DashboardReportController, AdminAnalyticsController],
  providers: [TenantSubscriptionResolver, TenantSubscriptionContextGuard],
  exports: [TenantSubscriptionResolver, TenantSubscriptionContextGuard],
})
export class ReportingModule {}
