import { AppConfiguration } from '@common/configuration/app.config';
import { BaseConfiguration } from '@common/configuration/base.config';
import { KafkaConfiguration } from '@common/configuration/kafka.config';
import { RedisConfiguration } from '@common/configuration/redis.config';
import { TcpConfiguration } from '@common/configuration/tcp.config';
import { TypeOrmConfiguration } from '@common/configuration/type-orm.config';
import { Type } from 'class-transformer';
import { IsString, ValidateNested } from 'class-validator';

const DEFAULT_ORDER_PAYMENT_CONSUMER_GROUP = 'order-payment-consumer-group';

class OrderAppConfiguration extends AppConfiguration {
  constructor() {
    super();
    this.PORT = Number(process.env['ORDER_PORT'] ?? 3301);
  }
}

class OrderTypeOrmConfiguration extends TypeOrmConfiguration {
  constructor() {
    super({
      DATABASE: process.env['ORDER_TYPEORM_DATABASE'] || process.env['TYPEORM_DATABASE'] || 'qrtable',
    });
  }
}

class OrderPaymentConsumerConfiguration {
  @IsString()
  GROUP_ID: string;

  constructor() {
    this.GROUP_ID = process.env['KAFKA_ORDER_PAYMENT_CONSUMER_GROUP'] || DEFAULT_ORDER_PAYMENT_CONSUMER_GROUP;
  }
}

class Configuration extends BaseConfiguration {
  @ValidateNested()
  @Type(() => OrderAppConfiguration)
  APP_CONFIG = new OrderAppConfiguration();

  @ValidateNested()
  @Type(() => TcpConfiguration)
  TCP_SERV = new TcpConfiguration();

  @ValidateNested()
  @Type(() => OrderTypeOrmConfiguration)
  TYPEORM_CONFIG = new OrderTypeOrmConfiguration();

  @ValidateNested()
  @Type(() => RedisConfiguration)
  REDIS_CONFIG = new RedisConfiguration();

  @ValidateNested()
  @Type(() => KafkaConfiguration)
  KAFKA_CONFIG = new KafkaConfiguration();

  @ValidateNested()
  @Type(() => OrderPaymentConsumerConfiguration)
  ORDER_PAYMENT_CONSUMER_CONFIG = new OrderPaymentConsumerConfiguration();
}

export const CONFIGURATION = new Configuration();
export type TConfiguration = typeof CONFIGURATION;

CONFIGURATION.validate();
