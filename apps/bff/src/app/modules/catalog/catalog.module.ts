import { TCP_SERVICES, TcpProvider } from '@common/configuration/tcp.config';
import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { CategoryAdminController } from './controllers/category.controller';
import { AreaAdminController } from './controllers/area.controller';
import { MenuItemAdminController } from './controllers/menu-item.controller';
import { TableAdminController } from './controllers/table.controller';
import { MenuPublicController } from './controllers/menu.controller';
import { CloudinaryModule } from '@common/providers/cloudinary/cloudinary.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ClientsModule.registerAsync([TcpProvider(TCP_SERVICES.CATALOG_SERVICE)]),
    CloudinaryModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        cloudName: configService.get<string>('CLOUDINARY_CLOUD_NAME', ''),
        apiKey: configService.get<string>('CLOUDINARY_API_KEY', ''),
        apiSecret: configService.get<string>('CLOUDINARY_API_SECRET', ''),
      }),
    }),
  ],
  controllers: [
    CategoryAdminController,
    AreaAdminController,
    MenuItemAdminController,
    TableAdminController,
    MenuPublicController,
  ],
  providers: [],
})
export class CatalogModule {}
