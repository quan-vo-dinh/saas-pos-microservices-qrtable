import { TypeOrmProvider } from '@common/configuration/type-orm.config';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Catalog } from '@common/entities/catalog.entity';
import { CatalogController } from './controllers/catalog.controller';
import { CatalogService } from './services/catalog.service';
import { CatalogRepository } from './repositories/catalog.repository';

@Module({
  imports: [TypeOrmProvider, TypeOrmModule.forFeature([Catalog])],
  controllers: [CatalogController],
  providers: [CatalogService, CatalogRepository],
})
export class CatalogModule {}
