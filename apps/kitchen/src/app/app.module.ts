import { RedisClientModule } from '@common/providers/redis-client/redis-client.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CONFIGURATION, TConfiguration } from '../configuration';
import { KitchenModule } from './modules/kitchen/kitchen.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, load: [() => CONFIGURATION] }), RedisClientModule, KitchenModule],
})
export class AppModule {
  static CONFIGURATION: TConfiguration = CONFIGURATION;
}
