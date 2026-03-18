import { TypeOrmProvider } from '@common/configuration/type-orm.config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CONFIGURATION, TConfiguration } from './configuration';
import { Catalog } from './entities/catalog.entity';
import { CatalogController } from './controllers/catalog.controller';
import { CatalogService } from './services/catalog.service';
import { CatalogRepository } from './repositories/catalog.repository';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [() => CONFIGURATION] }),
    TypeOrmProvider,
    TypeOrmModule.forFeature([Catalog]),
  ],
  controllers: [CatalogController],
  providers: [CatalogService, CatalogRepository],
})
export class AppModule {
  static CONFIGURATION: TConfiguration = CONFIGURATION;
}
