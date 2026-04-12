import { TypeOrmProvider } from '@common/configuration/type-orm.config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CONFIGURATION, TConfiguration } from '../configuration';
import { CategoryModule } from './modules/category/category.module';
import { AreaModule } from './modules/area/area.module';
import { MenuItemModule } from './modules/menu-item/menu-item.module';
import { TableModule } from './modules/table/table.module';
import { MenuModule } from './modules/menu/menu.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [() => CONFIGURATION] }),
    TypeOrmProvider,
    CategoryModule,
    AreaModule,
    MenuItemModule,
    TableModule,
    MenuModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  static CONFIGURATION: TConfiguration = CONFIGURATION;
}
