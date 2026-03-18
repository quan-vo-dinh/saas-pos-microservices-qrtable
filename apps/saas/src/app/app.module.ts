import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CONFIGURATION, TConfiguration } from '../configuration';
import { SaasModule } from './modules/saas/saas.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, load: [() => CONFIGURATION] }), SaasModule],
})
export class AppModule {
  static CONFIGURATION: TConfiguration = CONFIGURATION;
}
