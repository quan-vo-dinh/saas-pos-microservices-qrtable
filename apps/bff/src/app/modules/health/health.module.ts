import { TCP_SERVICES, TcpProvider } from '@common/configuration/tcp.config';
import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { HealthController } from './controllers/health.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([TcpProvider(TCP_SERVICES.CATALOG_SERVICE), TcpProvider(TCP_SERVICES.SAAS_SERVICE)]),
  ],
  controllers: [HealthController],
})
export class HealthModule {}
