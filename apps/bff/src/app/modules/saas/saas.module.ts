import { TCP_SERVICES, TcpProvider } from '@common/configuration/tcp.config';
import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { SaasController } from './controllers/saas.controller';

@Module({
  imports: [ClientsModule.registerAsync([TcpProvider(TCP_SERVICES.SAAS_SERVICE)])],
  controllers: [SaasController],
  providers: [],
})
export class SaasModule {}
