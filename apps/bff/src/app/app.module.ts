import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CONFIGURATION, TConfiguration } from '../configuration';
import { LoggerMiddleware } from '@common/middlewares/logger.middleware';
import { TenantMiddleware } from '@common/middlewares/tenant.middleware';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ExceptionInterceptor } from '@common/interceptors/exception.interceptor';
import { ProductModule } from './modules/product/product.module';
import { UserModule } from './modules/user/user.module';
import { AuthorizerModule } from './modules/authorizer/authorizer.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { SaasModule } from './modules/saas/saas.module';
import { HealthModule } from './modules/health/health.module';
import { KitchenModule } from './modules/kitchen/kitchen.module';
import { OrderModule } from './modules/order/order.module';
import { UserGuard } from '@common/guards/user.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { SessionGuard } from '@common/guards/session.guard';
import { TenantGuard } from '@common/guards/tenant.guard';
import { RedisProvider } from '@common/configuration/redis.config';
import { ThrottlerProvider } from '@common/configuration/throttler.config';
import { ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [() => CONFIGURATION] }),
    ProductModule,
    CatalogModule,
    KitchenModule,
    OrderModule,
    SaasModule,
    HealthModule,
    UserModule,
    AuthorizerModule,
    RedisProvider,
    ThrottlerProvider,
  ],
  controllers: [],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ExceptionInterceptor },
    {
      provide: APP_GUARD,
      useClass: UserGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SessionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {
  static CONFIGURATION: TConfiguration = CONFIGURATION;

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware, TenantMiddleware).forRoutes('*');
  }
}
