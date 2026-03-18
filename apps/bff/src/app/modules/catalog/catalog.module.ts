import { TCP_SERVICES, TcpProvider } from '@common/configuration/tcp.config';
import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { CatalogController } from './controllers/catalog.controller';

@Module({
  imports: [ClientsModule.registerAsync([TcpProvider(TCP_SERVICES.CATALOG_SERVICE)])],
  controllers: [CatalogController],
  providers: [],
})
export class CatalogModule {}
