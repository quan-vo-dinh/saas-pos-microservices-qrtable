import { createTypeOrmProvider } from '@common/configuration/type-orm.config';
import { Area } from '@common/entities/area.entity';
import { Category } from '@common/entities/category.entity';
import { MenuItem } from '@common/entities/menu-item.entity';
import { StockReservation } from '@common/entities/stock-reservation.entity';
import { Table } from '@common/entities/table.entity';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CONFIGURATION, TConfiguration } from '../configuration';
import { CategoryModule } from './modules/category/category.module';
import { AreaModule } from './modules/area/area.module';
import { MenuItemModule } from './modules/menu-item/menu-item.module';
import { TableModule } from './modules/table/table.module';
import { MenuModule } from './modules/menu/menu.module';
import { TenantEventsModule } from './modules/tenant-events/tenant-events.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [() => CONFIGURATION] }),
    createTypeOrmProvider([Area, Category, MenuItem, StockReservation, Table]),
    CategoryModule,
    AreaModule,
    MenuItemModule,
    TableModule,
    MenuModule,
    TenantEventsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  static CONFIGURATION: TConfiguration = CONFIGURATION;
}
