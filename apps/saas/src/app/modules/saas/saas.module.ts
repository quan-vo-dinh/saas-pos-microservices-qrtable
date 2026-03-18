import { TypeOrmProvider } from '@common/configuration/type-orm.config';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '@common/entities/tenant.entity';
import { SaasController } from './controllers/saas.controller';
import { SaasService } from './services/saas.service';
import { SaasRepository } from './repositories/saas.repository';

@Module({
  imports: [TypeOrmProvider, TypeOrmModule.forFeature([Tenant])],
  controllers: [SaasController],
  providers: [SaasService, SaasRepository],
})
export class SaasModule {}
