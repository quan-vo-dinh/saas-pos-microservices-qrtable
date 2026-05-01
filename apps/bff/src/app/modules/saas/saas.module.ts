import { TCP_SERVICES, TcpProvider } from '@common/configuration/tcp.config';
import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { CurrentTenantController } from './controllers/current-tenant.controller';
import { PublicTenantController } from './controllers/public-tenant.controller';
import { SaasController } from './controllers/saas.controller';

@Module({
  imports: [ClientsModule.registerAsync([TcpProvider(TCP_SERVICES.SAAS_SERVICE)])],
  controllers: [SaasController, PublicTenantController, CurrentTenantController],
  providers: [],
})
export class SaasModule {}
