import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CONFIGURATION, TConfiguration } from '../configuration';
import { CatalogModule } from './modules/catalog/catalog.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, load: [() => CONFIGURATION] }), CatalogModule],
})
export class AppModule {
  static CONFIGURATION: TConfiguration = CONFIGURATION;
}
