import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TCP_SERVICES, TcpProvider } from '@common/configuration/tcp.config';
import { Table } from '@common/entities/table.entity';
import { Area } from '@common/entities/area.entity';
import { MenuItemModule } from '../menu-item/menu-item.module';
import { TableController } from './controllers/table.controller';
import { CatalogReportService } from './services/catalog-report.service';
import { TableService } from './services/table.service';
import { TableRepository } from './repositories/table.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Table, Area]),
    ClientsModule.registerAsync([TcpProvider(TCP_SERVICES.SAAS_SERVICE)]),
    MenuItemModule,
  ],
  controllers: [TableController],
  providers: [TableService, TableRepository, CatalogReportService],
  exports: [TableService],
})
export class TableModule {}
