import { AppConfiguration } from '@common/configuration/app.config';
import { BaseConfiguration } from '@common/configuration/base.config';
import { KafkaConfiguration } from '@common/configuration/kafka.config';
import { TcpConfiguration } from '@common/configuration/tcp.config';
import { TypeOrmConfiguration } from '@common/configuration/type-orm.config';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

class PaymentAppConfiguration extends AppConfiguration {
  constructor() {
    super();
    this.PORT = Number(process.env['PAYMENT_PORT'] ?? 3303);
  }
}

class PaymentTypeOrmConfiguration extends TypeOrmConfiguration {
  constructor() {
    super({
      DATABASE: process.env['PAYMENT_TYPEORM_DATABASE'] || process.env['TYPEORM_DATABASE'] || 'qrtable',
    });
  }
}

class Configuration extends BaseConfiguration {
  @ValidateNested()
  @Type(() => PaymentAppConfiguration)
  APP_CONFIG = new PaymentAppConfiguration();

  @ValidateNested()
  @Type(() => TcpConfiguration)
  TCP_SERV = new TcpConfiguration();

  @ValidateNested()
  @Type(() => PaymentTypeOrmConfiguration)
  TYPEORM_CONFIG = new PaymentTypeOrmConfiguration();

  @ValidateNested()
  @Type(() => KafkaConfiguration)
  KAFKA_CONFIG = new KafkaConfiguration();
}

export const CONFIGURATION = new Configuration();
export type TConfiguration = typeof CONFIGURATION;

CONFIGURATION.validate();
