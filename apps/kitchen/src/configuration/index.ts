import { AppConfiguration } from '@common/configuration/app.config';
import { BaseConfiguration } from '@common/configuration/base.config';
import { KafkaConfiguration } from '@common/configuration/kafka.config';
import { RedisConfiguration } from '@common/configuration/redis.config';
import { TcpConfiguration } from '@common/configuration/tcp.config';
import { Type } from 'class-transformer';
import { IsNumber, ValidateNested } from 'class-validator';

class KitchenAppConfiguration extends AppConfiguration {
  constructor() {
    super();
    this.PORT = Number(process.env['KITCHEN_PORT'] || 3307);
  }
}

class KdsConfiguration {
  @IsNumber()
  DEFAULT_SLA_SECONDS = Number(process.env['KDS_DEFAULT_SLA_SECONDS'] || 900);

  @IsNumber()
  BREACH_GRACE_SECONDS = Number(process.env['KDS_BREACH_GRACE_SECONDS'] || 300);

  @IsNumber()
  SLA_WORKER_INTERVAL_MS = Number(process.env['KDS_SLA_WORKER_INTERVAL_MS'] || 5000);

  @IsNumber()
  RECALL_WINDOW_SECONDS = Number(process.env['KDS_RECALL_WINDOW_SECONDS'] || 300);

  @IsNumber()
  READY_RETENTION_SECONDS = Number(process.env['KDS_READY_RETENTION_SECONDS'] || 3600);

  @IsNumber()
  ARCHIVED_TTL_SECONDS = Number(process.env['KDS_ARCHIVED_TTL_SECONDS'] || 86400);
}

class Configuration extends BaseConfiguration {
  @ValidateNested()
  @Type(() => KitchenAppConfiguration)
  APP_CONFIG = new KitchenAppConfiguration();

  @ValidateNested()
  @Type(() => TcpConfiguration)
  TCP_SERV = new TcpConfiguration();

  @ValidateNested()
  @Type(() => RedisConfiguration)
  REDIS_CONFIG = new RedisConfiguration();

  @ValidateNested()
  @Type(() => KafkaConfiguration)
  KAFKA_CONFIG = new KafkaConfiguration();

  @ValidateNested()
  @Type(() => KdsConfiguration)
  KDS_CONFIG = new KdsConfiguration();

  constructor() {
    super();
    this.GLOBAL_PREFIX = process.env['GLOBAL_PREFIX'] || 'api/v1';
  }
}

export const CONFIGURATION = new Configuration();
export type TConfiguration = typeof CONFIGURATION;

CONFIGURATION.validate();
