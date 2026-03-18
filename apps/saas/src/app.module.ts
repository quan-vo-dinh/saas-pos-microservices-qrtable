import { TypeOrmProvider } from '@common/configuration/type-orm.config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CONFIGURATION, TConfiguration } from './configuration';
import { Tenant } from './entities/tenant.entity';
import { SaasController } from './controllers/saas.controller';
import { SaasService } from './services/saas.service';
import { SaasRepository } from './repositories/saas.repository';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [() => CONFIGURATION] }),
    TypeOrmProvider,
    TypeOrmModule.forFeature([Tenant]),
  ],
  controllers: [SaasController],
  providers: [SaasService, SaasRepository],
})
export class AppModule {
  static CONFIGURATION: TConfiguration = CONFIGURATION;
}
