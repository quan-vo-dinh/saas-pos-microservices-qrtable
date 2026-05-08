import { TypeOrmProvider } from '@common/configuration/type-orm.config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CONFIGURATION, TConfiguration } from '../configuration';
import { PaymentModule } from './modules/payment/payment.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, load: [() => CONFIGURATION] }), TypeOrmProvider, PaymentModule],
})
export class AppModule {
  static CONFIGURATION: TConfiguration = CONFIGURATION;
}
